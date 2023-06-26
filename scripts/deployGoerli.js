require('dotenv').config();

const {
  getRole,
  verify,
  ex,
  printAddress,
  deploySC,
  deploySCNoUp,
} = require('../utils');

async function deployGoerli() {
  // Deploy USDC
  var usdcContract = await deploySCNoUp('USDCoin');
  var implementationusdcContract = await printAddress(
    'USDC',
    usdcContract.address
  );
  verify(implementationusdcContract, 'USDC');

  // Deploy MiPrimerToken
  var miPrimerToken = await deploySC('MiPrimerToken', []);
  var implementationMiPrimerToken = await printAddress(
    'MiPrimerToken',
    miPrimerToken.address
  );
  verify(implementationMiPrimerToken, 'MiPrimerToken', []);

  // Deploy PublicSale
  var gnosis = { address: '0x655252000B5aC35239C9B7F112d3F252874763f4' };

  var publicSale = await deploySC('PublicSale', []);
  var implementationPublicSale = await printAddress(
    'PublicSale',
    publicSale.address
  );

  await ex(publicSale, 'setMiPrimerToken', [miPrimerToken.address], 'SMP');
  await ex(publicSale, 'setGnosisWallet', [gnosis.address], 'SGW');

  verify(implementationPublicSale, 'PublicSale', []);
}

deployGoerli().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
