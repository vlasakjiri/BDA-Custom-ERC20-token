const CustomToken = artifacts.require("CustomToken");
const { BN } = require('web3-utils');

contract("CustomToken", accounts =>
{
    const [admin1, admin2, recipient] = accounts;
    let token;

    beforeEach(async () =>
    {
        token = await CustomToken.new(new BN('100000'), [admin1, admin2], new BN('1000'));
    });

    it("should initialize correctly", async () =>
    {
        const maxSupply = await token.maxSupply();
        const tmax = await token.TMAX();
        expect(maxSupply.toString()).to.equal('100000');
        expect(tmax.toString()).to.equal('1000');
    });

    it("should allow mintingAdmin to mint tokens", async () =>
    {
        await token.mint(recipient, new BN('500'), { from: admin1 });
        const balance = await token.balanceOf(recipient);
        expect(balance.toString()).to.equal('500');
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
});