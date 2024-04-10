var CustomToken = artifacts.require("CustomToken");

module.exports = function (deployer, network, accounts)
{
    console.log('Deploying CustomToken to network', network);
    // console.log("\t --initial supply: ", conf.INITIAL_SUPPLY);

    // anybody can deploy contract - e.g., address[0]
    deployer.deploy(CustomToken, 2000, { from: accounts[0] }).then(() =>
    {
        console.log('Deployed CustomToken with address', CustomToken.address);
        console.log("\t \\/== Default gas limit:", CustomToken.class_defaults.gas);
    });
};