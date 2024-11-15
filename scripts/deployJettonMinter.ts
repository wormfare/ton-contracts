import { compile, NetworkProvider } from '@ton/blueprint';
import dotenvFlow from 'dotenv-flow';
import { join } from 'path';
import { jettonContentToCell, JettonMinter } from '../wrappers/JettonMinter';
import { address, toNano } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const envFile = `.env.${provider.network()}`;

    console.log(`Loading envs from file ${join(process.cwd(), envFile)}`);

    dotenvFlow.config({
        files: [envFile],
    });

    const metadataUrl = process.env.WOFR_METADATA_URL;
    const adminAddress = process.env.WOFR_ADMIN_ADDRESS;
    const ownerAddress = process.env.WOFR_OWNER_ADDRESS;

    if (!metadataUrl) {
        throw new Error(`Metadata URL is empty.`);
    }

    if (!adminAddress) {
        throw new Error(`Admin address is empty.`);
    }

    if (!ownerAddress) {
        throw new Error(`Owner address is empty.`);
    }

    const content = jettonContentToCell({ type: 1, uri: metadataUrl });
    const wallet_code = await compile('JettonWallet');

    const minter = provider.open(
        JettonMinter.createFromConfig(
            { admin: address(adminAddress), content, wallet_code },
            await compile('JettonMinter'),
        ),
    );

    await minter.sendDeploy(provider.sender(), toNano('0.1'));
    await provider.waitForDeploy(minter.address);

    console.log(`Minting 300M tokens to ${ownerAddress}`);

    await minter.sendMint(provider.sender(), address(ownerAddress), toNano('300000000'), toNano('0.05'), toNano('0.1'));

    console.log('Done');
}
