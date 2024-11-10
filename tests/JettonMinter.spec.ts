import { compile } from '@ton/blueprint';
import { beginCell, Cell, toNano } from '@ton/core';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import '@ton/test-utils';
import { Op } from '../wrappers/JettonConstants';
import { jettonContentToCell, JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';

describe('JettonMinter', () => {
    let blockchain: Blockchain;
    let minterCode: Cell;
    let walletCode: Cell;

    const metadataUrl = 'https://foo.json';
    let minterContent: Cell;
    let deployerWallet: SandboxContract<TreasuryContract>;
    let adminWallet: SandboxContract<TreasuryContract>;
    let ownerWallet: SandboxContract<TreasuryContract>;
    let aliceWallet: SandboxContract<TreasuryContract>;

    let minterContract: SandboxContract<JettonMinter>;

    beforeAll(async () => {
        minterCode = await compile('JettonMinter');
        walletCode = await compile('JettonWallet');
        minterContent = jettonContentToCell({ type: 1, uri: metadataUrl });
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        adminWallet = await blockchain.treasury('admin');
        ownerWallet = await blockchain.treasury('owner');
        aliceWallet = await blockchain.treasury('alice');

        minterContract = blockchain.openContract(
            JettonMinter.createFromConfig(
                { admin: adminWallet.address, content: minterContent, wallet_code: walletCode },
                minterCode,
            ),
        );

        deployerWallet = await blockchain.treasury('deployer');

        const deployResult = await minterContract.sendDeploy(deployerWallet.getSender(), toNano('0.1'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployerWallet.address,
            to: minterContract.address,
            deploy: true,
            success: true,
        });
    });

    const getJettonWallet = async (forWallet: SandboxContract<TreasuryContract>) => {
        const address = await minterContract.getWalletAddress(forWallet.address);

        return blockchain.openContract(JettonWallet.createFromAddress(address));
    };

    describe('permissions', () => {
        it('arbitrary account cannot mint tokens', async () => {
            const res = await minterContract.sendMint(
                aliceWallet.getSender(),
                aliceWallet.address,
                toNano('100'),
                toNano('0.05'),
                toNano('0.1'),
            );

            expect(res.transactions).toHaveTransaction({
                from: aliceWallet.address,
                to: minterContract.address,
                success: false,
                exitCode: 73,
            });
        });

        it('arbitrary account cannot change admin address', async () => {
            const res = await minterContract.sendChangeAdmin(aliceWallet.getSender(), aliceWallet.address);

            expect(res.transactions).toHaveTransaction({
                from: aliceWallet.address,
                to: minterContract.address,
                success: false,
                exitCode: 73,
            });
        });
    });

    describe('main logic', () => {
        it('should deploy', async () => {
            // the check is done inside beforeEach
            // blockchain and minter are ready to use
            const data = await minterContract.getJettonData();

            expect(data.mintable).toEqual(false);
            expect(data.totalSupply).toEqual(0n);
            expect(data.adminAddress.toString()).toEqual(adminWallet.address.toString());
        });

        it('mint 300,000,000 tokens', async () => {
            const res = await minterContract.sendMint(
                adminWallet.getSender(),
                ownerWallet.address,
                toNano('300000000'),
                toNano('0.05'),
                toNano('0.1'),
            );

            expect(res.transactions).toHaveTransaction({
                from: adminWallet.address,
                to: minterContract.address,
                success: true,
            });

            const data = await minterContract.getJettonData();

            expect(data.totalSupply).toEqual(toNano('300000000'));
        });

        it('admin cannot mint more than 300,000,000 tokens', async () => {
            const res = await minterContract.sendMint(
                adminWallet.getSender(),
                ownerWallet.address,
                toNano('300000000') + 1n,
                toNano('0.05'),
                toNano('0.1'),
            );

            expect(res.transactions).toHaveTransaction({
                from: adminWallet.address,
                to: minterContract.address,
                success: false,
                exitCode: 101,
            });
        });

        it('admin cannot mint tokens if the total supply is above zero', async () => {
            await minterContract.sendMint(
                adminWallet.getSender(),
                ownerWallet.address,
                1n,
                toNano('0.05'),
                toNano('0.1'),
            );
            const res = await minterContract.sendMint(
                adminWallet.getSender(),
                ownerWallet.address,
                1n,
                toNano('0.05'),
                toNano('0.1'),
            );

            expect(res.transactions).toHaveTransaction({
                from: adminWallet.address,
                to: minterContract.address,
                success: false,
                exitCode: 100,
            });
        });

        it('change admin address', async () => {
            await minterContract.sendChangeAdmin(adminWallet.getSender(), aliceWallet.address);

            const newAdminAddress = await minterContract.getAdminAddress();

            expect(newAdminAddress.toString()).toEqual(aliceWallet.address.toString());
        });

        it('transfer tokens', async () => {
            await minterContract.sendMint(
                adminWallet.getSender(),
                ownerWallet.address,
                toNano('100'),
                toNano('0.05'),
                toNano('0.1'),
            );

            const ownerJettonWallet = await getJettonWallet(ownerWallet);
            const aliceJettonWallet = await getJettonWallet(aliceWallet);
            const res = await ownerJettonWallet.sendTransfer(
                ownerWallet.getSender(),
                toNano('0.1'),
                toNano('20'),
                aliceWallet.address,
                aliceWallet.address,
                beginCell().endCell(),
                toNano('0.05'),
                beginCell().endCell(),
            );

            expect(res.transactions).toHaveTransaction({
                from: ownerWallet.address,
                to: ownerJettonWallet.address,
                success: true,
                op: Op.transfer,
            });

            const ownerBalance = await ownerJettonWallet.getJettonBalance();
            const aliceBalance = await aliceJettonWallet.getJettonBalance();

            expect(ownerBalance).toEqual(toNano('80'));
            expect(aliceBalance).toEqual(toNano('20'));
        });

        it('burn tokens', async () => {
            await minterContract.sendMint(
                adminWallet.getSender(),
                ownerWallet.address,
                toNano('100'),
                toNano('0.05'),
                toNano('0.1'),
            );

            const wallet = await getJettonWallet(ownerWallet);
            const res = await wallet.sendBurn(
                ownerWallet.getSender(),
                toNano('0.1'),
                toNano('50'),
                minterContract.address,
                beginCell().endCell(),
            );

            expect(res.transactions).toHaveTransaction({
                from: ownerWallet.address,
                to: wallet.address,
                success: true,
                op: Op.burn,
            });

            // const balance = await wallet.getJettonBalance();
            const totalSupply = await minterContract.getTotalSupply();

            // expect(balance).toEqual(toNano('50'));
            expect(totalSupply).toEqual(toNano('50'));
        });
    });
});
