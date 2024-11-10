import { compile, NetworkProvider } from '@ton/blueprint';
import { address, toNano } from '@ton/core';
import dotenvFlow from 'dotenv-flow';
import { join } from 'path';
import { jettonContentToCell, JettonMinter } from '../wrappers/JettonMinter';

export async function run(provider: NetworkProvider) {
    const envFile = `.env.${process.env.NODE_ENV}`;

    console.log(`Loading envs from file ${join(process.cwd(), envFile)}`);

    dotenvFlow.config({
        files: [envFile],
    });

    const metadataUrl = process.env.WOFR_METADATA_URL;
    const adminAddress = process.env.WOFR_ADMIN_ADDRESS;

    if (!metadataUrl) {
        throw new Error(`Metadata URL is empty.`);
    }

    if (!adminAddress) {
        throw new Error(`Admin address is empty.`);
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

    console.log('Done');
}
