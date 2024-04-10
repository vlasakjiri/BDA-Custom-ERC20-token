// You can adjust these two parameters of tests to your n-of-m multisig wallet contract

var MultiSigWalletConf = Object.freeze({
    NUMBER_OF_OWNERS: 10, // m
    REQUIRED_SIGS: 3, // n
})

module.exports = MultiSigWalletConf;