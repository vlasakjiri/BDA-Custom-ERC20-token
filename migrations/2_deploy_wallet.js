var W3 = require('web3');
var MultiSigWallet = artifacts.require("MultiSigWallet");
MAX_NUMBER_OF_OWNERS = 10

// load parameters of multisig wallet from config file
var conf = require("../config/wallet_config.js");

module.exports = function(deployer, network, accounts) {
    var owners = []

    if (conf.NUMBER_OF_OWNERS > MAX_NUMBER_OF_OWNERS) {
        throw "The number of owners is bigger than maximum"
    }

    if (network == "mainnet") {
        throw "Halt. Sanity check. Not ready for deployment to mainnet.";
    } else if (network == "sepolia" || network == "sepolia-fork") {
        owners.push("0x07F065753F2137580619486D14f5c82FF9f84736")
        owners.push("0xB098a974f390a5D66aC405B5058E05F41133a12A")
    } else { // development & test networks
        for (let i = 0; i < conf.NUMBER_OF_OWNERS; i++) {
            owners.push(accounts[i])
        }
    }

    console.log('Deploying MultiSigWallet to network', network);
    console.log("\t --owners: ", owners,
        ";\n\t --required signatures", conf.REQUIRED_SIGS
    );

    // anybody can deploy contract - e.g., address[0]
    result = deployer.deploy(MultiSigWallet, owners, conf.REQUIRED_SIGS, { from: accounts[0], gas: 2 * 1000 * 1000 }).then(() => {
        console.log('Deployed MultiSigWallet with address', MultiSigWallet.address);
        console.log("\t \\/== Default gas limit:", MultiSigWallet.class_defaults.gas);
    });
};


// NOTES
//
// var W3 = require('web3');
//
// MultiSigWallet.deployed().then(function(instance){return instance.getOwners()});
// MultiSigWallet.deployed().then(function(instance){return instance.getOwners.call()});

// Access migrated instance of contract
// MultiSigWallet.deployed().then(function(instance) {console.log(instance); });

// Get balance of contract
// W3.utils.fromWei(web3.eth.getBalance('... some address of contract...').toString(), 'ether');