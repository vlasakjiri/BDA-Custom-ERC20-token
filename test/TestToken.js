const CustomToken = artifacts.require("CustomToken");

contract("CustomToken", accounts =>
{
    let token;
    const initialSupply = 1000;

    beforeEach(async () =>
    {
        token = await CustomToken.new(initialSupply, { from: accounts[0] });
    });

    it("should put initialSupply amount of tokens in the first account", async () =>
    {
        const balance = await token.balanceOf(accounts[0]);
        assert.equal(balance.valueOf(), initialSupply, "First account did not receive the initial supply");
    });

    it("should be able to transfer tokens between accounts", async () =>
    {
        const amount = 10;
        await token.transfer(accounts[1], amount, { from: accounts[0] });
        const senderBalance = await token.balanceOf(accounts[0]);
        const receiverBalance = await token.balanceOf(accounts[1]);
        assert.equal(senderBalance.valueOf(), initialSupply - amount, "Amount wasn't correctly taken from the sender");
        assert.equal(receiverBalance.valueOf(), amount, "Amount wasn't correctly sent to the receiver");
    });

    // Add more tests as needed...
});