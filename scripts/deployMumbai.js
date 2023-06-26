require('dotenv').config();

const { getRole, verify, ex, printAddress, deploySC } = require('../utils');

var MINTER_ROLE = getRole('MINTER_ROLE');

async function deployMumbai() {
  var relayerAddress = '0xa4399061d0D3a5CA1EFb96e46BFC99778Bd26Df6';
  var nftContract = await deploySC('MiPrimerNft', []);
  var implementation = await printAddress('NFT', nftContract.address);

  // set up
  await ex(nftContract, 'grantRole', [MINTER_ROLE, relayerAddress], 'GR');
  await verify(implementation, 'MiPrimerNft', []);
}

deployMumbai().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
