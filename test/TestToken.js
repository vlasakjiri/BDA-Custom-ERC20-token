const CustomToken = artifacts.require("CustomToken");

contract("CustomToken", accounts =>
{
    let token;
    const initialSupply = 0;

    beforeEach(async () =>
    {
        token = await CustomToken.new({ from: accounts[0] });
    });

    it("should put initialSupply amount of tokens in the first account", async () =>
    {
        const balance = await token.balanceOf(accounts[0]);
        assert.equal(balance.valueOf(), 0, "First account did not receive the initial supply");
    });

    it("should return the correct total supply after construction", async () =>
    {
        const totalSupply = await token.totalSupply();
        assert.equal(totalSupply, initialSupply);
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



    it("should not allow to transfer more tokens than available in total", async () =>
    {
        try
        {
            await token.transfer(accounts[1], initialSupply + 1, { from: accounts[0] });
        } catch (error)
        {
            assert(error.message.includes("revert"), "Expected revert error, got: " + error.message);
            return;
        }
        assert.fail('Expected revert not received');
    });

    it("should not allow to transfer tokens from an account with insufficient balance", async () =>
    {
        try
        {
            await token.transferFrom(accounts[1], accounts[2], 1, { from: accounts[0] });
        } catch (error)
        {
            assert(error.message.includes("revert"), "Expected revert error, got: " + error.message);
            return;
        }
        assert.fail('Expected revert not received');
    });

    it("should update balances after transfers", async () =>
    {
        const amount = 100;
        await token.transfer(accounts[1], amount, { from: accounts[0] });
        const senderBalance = await token.balanceOf(accounts[0]);
        const receiverBalance = await token.balanceOf(accounts[1]);
        assert.equal(senderBalance, initialSupply - amount);
        assert.equal(receiverBalance, amount);
    });

    // Add more tests as needed...
});