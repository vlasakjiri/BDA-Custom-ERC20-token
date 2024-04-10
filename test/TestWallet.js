var MultiSigWallet = artifacts.require("MultiSigWallet");
var Web3 = require('web3');
var W3 = new Web3();
const BN = web3.utils.BN;

// load parameters of multisig wallet from config file
var conf = require("../config/wallet_config.js");

const GAS_PRICE = 20000000000; // in Wei

contract(' TEST SUITE 1 [ Basic functionality of multisig wallet ]', function (accounts)
{

    var INITIAL_BALANCE = W3.utils.toWei("1", 'ether'); // in wei
    var VALUE_SENT = W3.utils.toWei("0.1", 'ether'); // in wei
    var TOO_BIG_AMOUNT = W3.utils.toWei("1000", 'ether'); // in wei
    var RECEPIENT = accounts[9];

    it("Zero Ballance", async () =>
    {
        var contract = await MultiSigWallet.deployed()
        console.log("Address of wallet's contract is: ", contract.address);
        var balance = await web3.eth.getBalance(contract.address);
        assert.equal(0, balance);
    });

    it("Contract owners are correct.", async () =>
    {
        var contract = await MultiSigWallet.deployed()

        for (let i = 0; i < conf.NUMBER_OF_OWNERS; i++)
        {
            var owner = await contract.owners.call(i);
            assert.equal(accounts[i], owner);
        }
    });

    it("Send money to contract by account[0]", async () =>
    {
        var contract = await MultiSigWallet.deployed()
        var receipt = await web3.eth.sendTransaction({
            from: accounts[0],
            to: contract.address,
            value: INITIAL_BALANCE
        })
        console.log("\t \\/== Gas used for sending ether to the contract: ", receipt.gasUsed);

        var contrBalance = await web3.eth.getBalance(contract.address);
        console.log("\t Current balance of contract is", W3.utils.fromWei(contrBalance.toString(), 'ether'), 'Ethers.');
        assert.equal(contrBalance, W3.utils.toWei('1', 'ether'));

        var senderBalance = await web3.eth.getBalance(accounts[0]);
        assert.ok(senderBalance < W3.utils.toWei('99', 'ether'));
    });

    it("Submit (and confirm) new transaction by the 1st owner (i.e., account[0])", async () =>
    {
        var contract = await MultiSigWallet.deployed()
        var receipt = await contract.submitTransaction(RECEPIENT, VALUE_SENT, { from: accounts[0] });
        console.log("\t \\/== Gas used for submitTransaction() by owner[0]: ", receipt.receipt.gasUsed);

        console.log(receipt);

        assert(isEventInLogs("Submission", receipt.receipt.logs))
        assert(isEventInLogs("Confirmation", receipt.receipt.logs))

        // for demonstration purposes, you may check count of signatures and call other UI intended functions
        var sigCnt = await contract.getSignatureCount.call(0);
        assert.equal(sigCnt, 1);

        // for demonstration purposes we check how/whether the storage of blokchain was updated
        var cnt = await contract.transactionCount.call()
        assert.equal(cnt, 1);

        var tx = await contract.transactions.call(0);
        assert.equal(tx.destination, RECEPIENT)
        assert.equal(tx.value, VALUE_SENT)
    });

    it("Confirm (i.e., co-sign) and execute transaction by remaining n-1 owners (i.e., account[1]... account[n - 1])", async () =>
    {
        var contract = await MultiSigWallet.deployed()
        var recepientBefore = await web3.eth.getBalance(RECEPIENT); // store the balance of recepient before execution of transaction
        var gasPayedByRecepient = 0;
        var txID = 0; // the 1st transaction

        // the rest of minimal required owners sign the transaction
        var receipt;
        for (let i = 1; i < conf.REQUIRED_SIGS; i++)
        {
            receipt = await contract.confirmTransaction(txID, { from: accounts[i] });
            console.log(receipt);
            console.log(`\t \\/== Gas used for confirmTransaction() by owner[${i}] is: `, receipt.receipt.gasUsed);
            if (RECEPIENT === accounts[i])
                gasPayedByRecepient = receipt.receipt.gasUsed; // this is required to take into consideration when checking the recepient's balance after
            assert(isEventInLogs("Confirmation", receipt.receipt.logs))
        }
        // since we have already all required signatures, the last confirmation mut cause tx to be also executed
        assert(isEventInLogs("Execution", receipt.receipt.logs));


        // check whether is transaction confirmed
        var isConfirmed = await contract.isTxConfirmed.call(txID);
        assert(isConfirmed)

        // you may check count of signatures
        var sigCnt = await contract.getSignatureCount.call(txID);
        assert.equal(sigCnt, conf.REQUIRED_SIGS);

        //check balance of contract and recipient after execution of transaction
        var contrBalance = await web3.eth.getBalance(contract.address);
        assert.equal((new BN(contrBalance)).add(new BN(VALUE_SENT)), INITIAL_BALANCE);

        var recepientAfter = await web3.eth.getBalance(RECEPIENT);
        assert.equal((new BN(recepientBefore)).add(new BN(VALUE_SENT)).sub(new BN(gasPayedByRecepient * GAS_PRICE)), recepientAfter);
    });

    it("Check replay protection by initiating already executed transaction again.", async () =>
    {
        var contract = await MultiSigWallet.deployed()
        var contractBefore = await web3.eth.getBalance(contract.address); // store the balance of recepient before execution of transaction
        var txID = 0; // the 1st one

        try
        {
            var receipt = await contract.executeTransaction(txID, { from: accounts[9] }); // the sender can be anybody, as tx is already confirmed    

            // the previously executed transaction is executed again by anybody == replay attack
            var contractAfter = await web3.eth.getBalance(contract.address);
            assert.equal((new BN(contractAfter)).add(new BN(VALUE_SENT)), contractBefore);
            assert.fail('Replay attack was successfull.');
        } catch (error)
        {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`);
        }
    });


    it("Check event NotEnoughBalance is emitted properly.", async () =>
    {
        var contract = await MultiSigWallet.deployed()
        var txID = 1; // the 2nd one
        var receipt = await contract.submitTransaction(RECEPIENT, TOO_BIG_AMOUNT, { from: accounts[0] });
        for (let i = 1; i < conf.REQUIRED_SIGS; i++)
        {
            receipt = await contract.confirmTransaction(txID, { from: accounts[i] });
            assert(isEventInLogs("Confirmation", receipt.receipt.logs))
        }
        assert(isEventInLogs("Confirmation", receipt.receipt.logs));

        assert(isEventInLogs("NotEnoughBalance", receipt.receipt.logs));
    });


    it("Get owners who signed the 2nd transaction (i.e., ID = 1).", async () =>
    {
        var contract = await MultiSigWallet.deployed()
        var txID = 1; // the 1st one

        try
        {
            var signersOfLastTx = await contract.getOwnersWhoSignedTx.call(txID);
        } catch (error)
        {
            const typeError = error.message.search('call') >= 0;
            assert(typeError, `Expected TypeError, got ${error} instead`);
            throw "Function getOwnersWhoSignedTx() is not implemented yet."
        }

        // console.log(signersOfLastTx);
        for (let i = 0; i < conf.REQUIRED_SIGS; i++)
        {
            assert(signersOfLastTx.includes(accounts[i]));
        }



    });
});



/// AUX Functions

function isEventInLogs(event, logs)
{
    for (let i = 0; i < logs.length; i++)
    {
        if (logs[i].event !== undefined && logs[i].event == event)
        {
            return true;
        }
    }
    return false;
};