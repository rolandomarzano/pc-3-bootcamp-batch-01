require('dotenv').config();

const {
  getRole,
  verify,
  ex,
  printAddress,
  deploySC,
  deploySCNoUp,
} = require('../utils');

var MINTER_ROLE = getRole('MINTER_ROLE');
var BURNER_ROLE = getRole('BURNER_ROLE');

async function deployMumbai() {
  var relayerAddress = '0xeb0868cf925105ac466c2b19039301e904061514';
  var nftContract = await deploySC('MiPrimerNft', []);
  var implementation = await printAddress('NFT', nftContract.address);

  // set up
  await ex(nftTknContract, 'grantRole', [MINTER_ROLE, relayerAddress], 'GR');
  await verify(implementation, 'MiPrimerNft', []);
}

async function deployGoerli() {
  // gnosis safe
  // Crear un gnosis safe en https://gnosis-safe.io/app/
  // Extraer el address del gnosis safe y pasarlo al contrato con un setter
  var gnosis = { address: '0x655252000B5aC35239C9B7F112d3F252874763f4' };
}

// deployMumbai()
deployGoerli()
  //
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
