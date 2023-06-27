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
  var gnosis = { address: '0x655252000B5aC35239C9B7F112d3F252874763f4' };

  var publicSale = await deploySC('PublicSale');
  var miPrimerToken = await deploySC('MiPrimerToken');
  var usdcContract = await deploySCNoUp('USDCoin');

  var implementationPublicSale = await printAddress(
    'PublicSale',
    publicSale.address
  );

  var implementationMiPrimerToken = await printAddress(
    'MiPrimerToken',
    miPrimerToken.address
  );

  await ex(publicSale, 'setMiPrimerToken', [miPrimerToken.address], 'SMP');
  await ex(publicSale, 'setGnosisSafeWallet', [gnosis.address], 'SGW');

  verify(implementationPublicSale, 'PublicSale', []);
  verify(implementationMiPrimerToken, 'MiPrimerToken', []);
  verify(usdcContract.address, 'USDC');
}

deployGoerli().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
