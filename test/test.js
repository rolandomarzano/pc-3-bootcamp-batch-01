const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

const { getRole, deploySC, deploySCNoUp, ex, pEth } = require('../utils');

const MINTER_ROLE = getRole('MINTER_ROLE');
const BURNER_ROLE = getRole('BURNER_ROLE');

// 17 de Junio del 2023 GMT
var startDate = 1686960000;

var makeBN = (num) => ethers.BigNumber.from(String(num));

describe('MI PRIMER TOKEN TESTING', function () {
  var nftContract, publicSale, miPrimerToken, usdc;
  var owner, gnosis, alice, bob, carl, deysi;
  var name = 'MiPrimerNft';
  var symbol = 'MPRNFTRM';

  before(async () => {
    [owner, gnosis, alice, bob, carl, deysi] = await ethers.getSigners();
  });

  // Estos dos métodos a continuación publican los contratos en cada red
  // Se usan en distintos tests de manera independiente
  // Ver ejemplo de como instanciar los contratos en deploy.js
  async function deployNftSC() {
    nftContract = await deploySC('MiPrimerNft', []);
    // role minter para alice
    await nftContract.grantRole(MINTER_ROLE, alice.address);
  }

  async function deployPublicSaleSC() {
    miPrimerToken = await deploySC('MiPrimerToken');
    publicSale = await deploySC('PublicSale');
    // Config de address
    await ex(publicSale, 'setMiPrimerToken', [miPrimerToken.address]);
    await ex(publicSale, 'setGnosisSafeWallet', [gnosis.address]);
    // Minteo 10k tokens
    await miPrimerToken.connect(owner).mint(alice.address, pEth('100000'));
    // Approve 10k tokens
    await miPrimerToken
      .connect(alice)
      .approve(publicSale.address, pEth('100000'));
  }

  describe('Mi Primer Nft Smart Contract', () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployNftSC();
    });

    it('Verifica nombre colección', async () => {
      expect(await nftContract.name()).to.be.equal(name);
    });

    it('Verifica símbolo de colección', async () => {
      expect(await nftContract.symbol()).to.be.equal(symbol);
    });

    it('No permite acuñar sin privilegio', async () => {
      expect(await nftContract.connect(bob).hasRole(MINTER_ROLE, bob.address))
        .to.be.false;
    });

    it('No permite acuñar doble id de Nft', async () => {
      await nftContract.connect(alice).safeMint(alice.address, 1);
      await expect(
        nftContract.connect(alice).safeMint(alice.address, 1)
      ).to.be.revertedWith('Public Sale: id not available');
    });

    it('Verifica rango de Nft: [1, 30]', async () => {
      // Mensaje error: "NFT: Token id out of range"
      // Public Sale: id must be between 1 and 30
      await expect(
        nftContract.connect(alice).safeMint(alice.address, 31)
      ).to.be.revertedWith('Public Sale: id must be between 1 and 30');
    });

    it('Se pueden acuñar todos (30) los Nfts', async () => {
      for (var i = 1; i <= 30; i++) {
        await nftContract.connect(alice).safeMint(alice.address, i);
      }
      expect(await nftContract.totalSupply()).to.be.equal(30);
    });
  });

  describe('Public Sale Smart Contract', () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployPublicSaleSC();
    });

    it('No se puede comprar otra vez el mismo ID', async () => {
      await publicSale.connect(alice).purchaseNftById(1);
      await expect(
        publicSale.connect(alice).purchaseNftById(1)
      ).to.be.revertedWith('Public Sale: id not available');
    });

    it('IDs aceptables: [1, 30]', async () => {
      await expect(
        publicSale.connect(alice).purchaseNftById(31)
      ).to.be.revertedWith('NFT: Token id out of range');
    });

    it('Usuario no dio permiso de MiPrimerToken a Public Sale', async () => {
      await expect(
        publicSale.connect(bob).purchaseNftById(1)
      ).to.be.revertedWith('Public Sale: Not enough allowance');
    });

    it('Usuario no tiene suficientes MiPrimerToken para comprar', async () => {
      await miPrimerToken
        .connect(bob)
        .approve(publicSale.address, pEth('10000'));
      await expect(
        publicSale.connect(bob).purchaseNftById(1)
      ).to.be.revertedWith('Public Sale: Not enough token balance');
    });

    describe('Compra grupo 1 de NFT: 1 - 10', () => {
      it('Emite evento luego de comprar', async () => {
        // modelo para validar si evento se disparo con correctos argumentos
        // var tx = await publicSale.purchaseNftById(id);
        // await expect(tx)
        //   .to.emit(publicSale, "DeliverNft")
        //   .withArgs(owner.address, counter);

        const tx = await publicSale.connect(alice).purchaseNftById(1);
        await expect(tx)
          .to.emit(publicSale, 'DeliverNft')
          .withArgs(alice.address, 1);
      });

      it('Disminuye balance de MiPrimerToken luego de compra', async () => {
        // Usar changeTokenBalance
        // source: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#change-token-balance
        const tx = await publicSale.connect(alice).purchaseNftById(1);
        await expect(tx).to.changeTokenBalance(
          miPrimerToken,
          alice,
          pEth('-500')
        );
      });

      it('Gnosis safe recibe comisión del 10% luego de compra', async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(1);
        await expect(tx).to.changeTokenBalance(
          miPrimerToken,
          gnosis,
          pEth('50')
        );
      });

      it('Smart contract recibe neto (90%) luego de compra', async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(1);
        await expect(tx).to.changeTokenBalance(
          miPrimerToken,
          publicSale,
          pEth('450')
        );
      });
    });

    describe('Compra grupo 2 de NFT: 11 - 20', () => {
      const priceIncrement = 1000;
      const fee = 0.1;
      const net = 0.9;
      beforeEach(async () => {
        await miPrimerToken
          .connect(alice)
          .approve(publicSale.address, pEth('100000'));
      });

      it('Emite evento luego de comprar', async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(12);
        await expect(tx)
          .to.emit(publicSale, 'DeliverNft')
          .withArgs(alice.address, 12);
      });
      it('Disminuye balance de MiPrimerToken luego de compra', async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(12);
        const price = priceIncrement * 12;
        await expect(tx).to.changeTokenBalance(
          miPrimerToken,
          alice,
          pEth((-price).toString())
        );
      });
      it('Gnosis safe recibe comisión del 10% luego de compra', async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(12);
        const price = 12 * priceIncrement * fee;
        await expect(tx).to.changeTokenBalance(
          miPrimerToken,
          gnosis,
          pEth(price.toString())
        );
      });
      it('Smart contract recibe neto (90%) luego de compra', async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(12);
        const price = 12 * priceIncrement * net;
        await expect(tx).to.changeTokenBalance(
          miPrimerToken,
          publicSale,
          pEth(price.toString())
        );
      });
    });
    describe('Compra grupo 3 de NFT: 21 - 30', () => {
      const MAX_PRICE_NFT = 50000;
      const LEGENDARY_PRICE_BASE = 10000;
      const priceIncrement = 1000;
      const fee = 0.1;
      const net = 0.9;
      function getPrice(timestamp) {
        const hoursPassed = Math.floor((timestamp - startDate) / 3600);
        let priceGroupThree = hoursPassed * priceIncrement;
        let price = Math.min(
          Math.max(priceGroupThree, LEGENDARY_PRICE_BASE),
          MAX_PRICE_NFT
        );
        return price;
      }

      it('Disminuye balance de MiPrimerToken luego de compra', async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(22);
        const blocktimestamp = await time.latest();
        let price = getPrice(blocktimestamp);
        await expect(tx).to.changeTokenBalance(
          miPrimerToken,
          alice,
          parseEth(-price)
        );
      });
      it('Gnosis safe recibe comisión del 10% luego de compra', async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(22);
        const blocktimestamp = await time.latest();
        let price = getPrice(blocktimestamp) * fee;
        await expect(tx).to.changeTokenBalance(
          miPrimerToken,
          gnosis,
          parseEth(price)
        );
      });
      it('Smart contract recibe neto (90%) luego de compra', async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(22);
        const blocktimestamp = await time.latest();
        let price = getPrice(blocktimestamp) * net;
        await expect(tx).to.changeTokenBalance(
          miPrimerToken,
          publicSale,
          parseEth(price)
        );
      });
    });
    describe('Depositando Ether para Random NFT', () => {
      it('Método emite evento (30 veces) ', async () => {
        for (let i = 1; i < 31; i++) {
          const tx = await publicSale.connect(alice).depositEthForARandomNft({
            value: pEth('0.01'),
          });
          await expect(tx).to.emit(publicSale, 'DeliverNft');
        }
      });
      it('Método falla la vez 31', async () => {
        for (var i = 0; i < 30; i++) {
          var tx = await publicSale.connect(alice).depositEthForARandomNft({
            value: pEth('0.01'),
          });

          await expect(tx).to.emit(publicSale, 'DeliverNft');
        }
        // Vez 31
        await expect(
          publicSale.connect(alice).depositEthForARandomNft({
            value: pEth('0.01'),
          })
        ).to.be.revertedWith('Public Sale: No more NFTs available');
      });
      it('Envío de Ether y emite Evento (30 veces)', async () => {
        for (let i = 1; i < 31; i++) {
          const tx = await alice.sendTransaction({
            to: publicSale.address,
            value: pEth('0.01'),
          });
          await expect(tx).to.emit(publicSale, 'DeliverNft');
        }
      });
      it('Envío de Ether falla la vez 31', async () => {
        for (var i = 0; i < 30; i++) {
          var tx = await alice.sendTransaction({
            to: publicSale.address,
            value: pEth('0.01'),
          });

          await expect(tx).to.emit(publicSale, 'DeliverNft');
        }
        // Vez 31
        await expect(
          alice.sendTransaction({
            to: publicSale.address,
            value: pEth('0.01'),
          })
        ).to.be.revertedWith('Public Sale: No more NFTs available');
      });
      it.only('Da vuelto cuando y gnosis recibe Ether', async () => {
        // Usar el método changeEtherBalances
        // Source: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#change-ether-balance-multiple-accounts
        // Ejemplo:
        // await expect(
        //   await owner.sendTransaction({
        //     to: publicSale.address,
        //     value: pEth("0.02"),
        //   })
        // ).to.changeEtherBalances(
        //   [owner.address, gnosis.address],
        //   [pEth("-0.01"), pEth("0.01")]
        // );
        await expect(
          await owner.sendTransaction({
            to: publicSale.address,
            value: pEth('0.02'),
          })
        ).to.changeEtherBalances(
          [owner.address, gnosis.address],
          [pEth('-0.01'), pEth('0.01')]
        );
      });
    });
  });
});
