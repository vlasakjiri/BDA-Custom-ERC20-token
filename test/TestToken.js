const CustomToken = artifacts.require("CustomToken");
const { BN } = require('web3-utils');

contract("CustomToken", accounts =>
{
    const [admin1, admin2, recipient] = accounts;
    let token;

    beforeEach(async () =>
    {
        token = await CustomToken.new(new BN('100000'), [admin1, admin2], new BN('1000'), new BN('1000'));
    });

    it("should initialize correctly", async () =>
    {
        const maxSupply = await token.maxSupply();
        const tmax = await token.GetTMAX();
        expect(maxSupply.toString()).to.equal('100000');
        expect(tmax.toString()).to.equal('1000');
    });

    it("should allow mintingAdmin to mint tokens", async () =>
    {
        const tx = await token.mint(recipient, new BN('500'), { from: admin1 });
        const balance = await token.balanceOf(recipient);
        expect(balance.toString()).to.equal('500');
        //log gas used
        console.log('Gas used for minting: ' + tx.receipt.gasUsed);

    });

    it("should not allow non-mintingAdmin to mint tokens", async () =>
    {
        try
        {
            await token.mint(recipient, new BN('500'), { from: recipient });
        } catch (error)
        {
            assert(error.message.indexOf('Caller is not a minter') >= 0, 'error message must contain "Caller is not a minter"');
        }
    });

    it("should not allow minting more than TMAX in a day", async () =>
    {
        try
        {
            await token.mint(recipient, new BN('1001'), { from: admin1 });
        } catch (error)
        {
            assert(error.message.indexOf("Individual daily limit exceeded") >= 0, 'error message must contain "Individual daily limit exceeded"');
        }
    });

    it("should not allow minting more than TMAX in a day in multiple transactions", async () =>
    {
        try
        {
            await token.mint(recipient, new BN('600'), { from: admin1 });
            await token.mint(recipient, new BN('600'), { from: admin1 });
        } catch (error)
        {
            assert(error.message.indexOf("Individual daily limit exceeded") >= 0, 'error message must contain "Individual daily limit exceeded"');
        }
    });

    it("should not allow minting more than max supply", async () =>
    {
        try
        {
            await token.mint(recipient, new BN('2000000'), { from: admin1 });
        } catch (error)
        {
            assert(error.message.indexOf('Cannot mint more than max supply') >= 0, 'error message must contain "Cannot mint more than max supply"');
        }
    });

    it("should allow mintingAdmin to mint tokens in batch", async () =>
    {
        const recipients = [accounts[3], accounts[4]];
        const amounts = [new BN('200'), new BN('300')];
        const tx = await token.mintBatch(recipients, amounts, { from: admin1 });
        const balance1 = await token.balanceOf(recipients[0]);
        const balance2 = await token.balanceOf(recipients[1]);
        expect(balance1.toString()).to.equal('200');
        expect(balance2.toString()).to.equal('300');
        //log gas used
        console.log('Gas used for minting in batch: ' + tx.receipt.gasUsed);
    });



    it("should not allow burning of tokens", async () =>
    {
        const initialTotalSupply = await token.totalSupply();
        const initialBalance = await token.balanceOf(admin1);

        try
        {
            await token.transfer('0x0000000000000000000000000000000000000000', new BN('100'), { from: admin1 });
        } catch (error)
        {
            // Expected error as burning is not allowed
        }

        const finalTotalSupply = await token.totalSupply();
        const finalBalance = await token.balanceOf(admin1);

        expect(finalTotalSupply.toString()).to.equal(initialTotalSupply.toString());
        expect(finalBalance.toString()).to.equal(initialBalance.toString());
    });


    it("should change TMAX if more than half of mintingAdmins vote for it", async () =>
    {
        const newTMAX = new BN('2000');
        const tx1 = await token.proposeTMAX(newTMAX, { from: admin1 });
        await token.proposeTMAX(newTMAX, { from: admin2 });
        const tmax = await token.GetTMAX();
        expect(tmax.toString()).to.equal(newTMAX.toString());
        //log gas used
        console.log('Gas used for proposing TMAX: ' + tx1.receipt.gasUsed);
    });

    it("should not change TMAX if less than half of mintingAdmins vote for it", async () =>
    {
        const newTMAX = new BN('2000');
        await token.proposeTMAX(newTMAX, { from: admin1 });
        const tmax = await token.GetTMAX();
        expect(tmax.toString()).to.not.equal(newTMAX.toString());
    });

    it("TMAX should reset after each day", async () =>
    {

        await token.mint(recipient, new BN('600'), { from: admin1 });
        await increaseTime(25 * 60 * 60);
        await token.mint(recipient, new BN('600'), { from: admin1 });
        const balance = await token.balanceOf(recipient);
        expect(balance.toString()).to.equal('1200');

    });
});

contract('CustomTokenAdminManagement', (accounts) =>
{
    let token;
    const admin1 = accounts[0];
    const admin2 = accounts[1];
    const admin3 = accounts[2];
    const candidate = accounts[3];

    beforeEach(async () =>
    {
        token = await CustomToken.new(new BN('100000'), [admin1, admin2, admin3], new BN('1000'), new BN('1000'));
        // Assuming admin1 is the deployer and already a minter
    });

    it("should allow mintingAdmins to propose a new mintAdmin", async () =>
    {
        const tx = await token.addMintAdmin(candidate, { from: admin1 });
        const admins = await token.getMintingAdmins();
        expect(admins).to.not.include(candidate);
        await token.addMintAdmin(candidate, { from: admin2 });
        const admins2 = await token.getMintingAdmins();
        expect(admins2).to.include(candidate);

        //log gas used
        console.log('Gas used for proposing a new mintAdmin: ' + tx.receipt.gasUsed);
    });

    it("should allow mintingAdmins to propose removal of a mintAdmin", async () =>
    {
        const tx = await token.removeMintAdmin(admin3, { from: admin1 });
        await token.removeMintAdmin(admin3, { from: admin2 });
        const admins = await token.getMintingAdmins();
        expect(admins).to.not.include(admin3);

        //log gas used
        console.log('Gas used for proposing removal of a mintAdmin: ' + tx.receipt.gasUsed);

    });
});

contract('CustomTokenTransferLimits', (accounts) =>
{
    let token;
    const admin1 = accounts[0];
    const admin2 = accounts[1];
    const user1 = accounts[2];
    const user2 = accounts[3];

    beforeEach(async () =>
    {
        token = await CustomToken.new(new BN('100000'), [admin1, admin2], new BN('10000'), new BN('1000'));

        // Assuming admin1 is the deployer and already a minter
        await token.addMintAdmin(admin2, { from: admin1 });
        await token.mint(user1, 2000, { from: admin1 }); // Mint some tokens to user1 for testing
    });

    it("should allow transfers within the daily limit", async () =>
    {
        const tx = await token.transfer(user2, 500, { from: user1 });
        const balance = await token.balanceOf(user2);
        assert.equal(balance.toNumber(), 500, "Transfer did not work correctly within the daily limit");
        //log gas used
        console.log('Gas used for transfer within daily limit: ' + tx.receipt.gasUsed);
    });

    it("should not allow transfers that exceed the daily limit", async () =>
    {
        try
        {
            await token.transfer(user2, 2001, { from: user1 });
            assert.fail("The transaction should have thrown an error");
        } catch (err)
        {
            assert.include(err.message, "Individual daily limit exceeded", "The error message should contain 'Individual daily limit exceeded'");
        }
    });

    it("should reset the daily transfer limit after a day", async () =>
    {
        await token.transfer(user2, 1000, { from: user1 });
        // Simulate the passing of a day
        await increaseTime(24 * 60 * 60 + 1);
        await token.transfer(user2, 1000, { from: user1 });
        const balance = await token.balanceOf(user2);
        assert.equal(balance.toNumber(), 2000, "The daily transfer limit did not reset after a day");
    });
});

const increaseTime = function (duration)
{
    const id = Date.now()

    return new Promise((resolve, reject) =>
    {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [duration],
            id: id,
        }, err1 =>
        {
            if (err1) return reject(err1)

            web3.currentProvider.send({
                jsonrpc: '2.0',
                method: 'evm_mine',
                id: id + 1,
            }, (err2, res) =>
            {
                return err2 ? reject(err2) : resolve(res)
            })
        })
    })
}