import {
    ActionPostResponse,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
    createActionHeaders,
    ActionError,
} from "@solana/actions";

import {
    clusterApiUrl,
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    sendAndConfirmRawTransaction,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";

import { DEFAULT_SOL_ADDRESS, DEFAULT_SOL_AMOUNT } from "./const";

// create the standard headers for this route (including CORS)
const headers = createActionHeaders();

let toPubkey: PublicKey = DEFAULT_SOL_ADDRESS;
let amount: number = DEFAULT_SOL_AMOUNT;
let contactInfo: string = "";
let account: PublicKey | null = null;

// Define the variable to store the most recent transaction hash
let mostRecentTransactionHash: string | null = null;

export const GET = async (req: Request) => {
    try {
        const requestUrl = new URL(req.url); // the url of the current request
        console.log(`requestUrl: ${requestUrl}`);
        const { toPubkey: newToPubkey, amount: newAmount, contactInfo: newContactInfo } = validatedQueryParams(requestUrl);
        toPubkey = newToPubkey;
        amount = newAmount;
        contactInfo = newContactInfo;
        console.log(`validatedQueryParams: ${JSON.stringify(validatedQueryParams(requestUrl))}`);
        // validatedQueryParams: {"amount":1,"toPubkey":"nick6zJc6HpW3kfBm4xS2dmbuVRyb5F3AnUvj5ymzR5"}

        const baseHref = new URL(
            `/api/actions/transfer-sol?to=${toPubkey.toBase58()}`,
            requestUrl.origin,
        ).toString();
        console.log(baseHref);
        // http://localhost:3000/api/actions/transfer-sol?to=3oGRxuPz1Q1ergQ1WvvTtMQthdPAM5pZ9mjEJMSA7xmy

        const payload: ActionGetResponse = {
            type: "action",
            title: "Math Tuition | 0.1 sol",
            icon: new URL("/gambar_izhan.jpg", requestUrl.origin).toString(),
            description: "\nLooking to ace your math exams? 📚 Join our 3-hour intensive math tuition session and master the fundamentals with ease! This session is perfect for students who want to boost their skills, solve problems confidently, and understand key concepts better.\n\n\n\nPrice: Only 0.1 SOL for expert guidance and practice to help you excel in math.",
            label: "Transfer", // this value will be ignored since `links.actions` exists
            links: {
                actions: [
                    {
                        label: "Purchase", // button text
                        href: `${baseHref}&amount=${"0.1"}&contactInfo={contactInfo}`, // this href will have a text input
                        parameters: [
                            {
                                name: "contactInfo", // parameter name in the `href` above
                                label: "email", // placeholder of the text input
                                required: true,
                            },
                        ],
                    },
                ],
            },
        };

        return Response.json(payload, {
            headers,
        });
    } catch (err) {
        console.log(err);
        let actionError: ActionError = { message: "An unknown error occurred" };
        if (typeof err == "string") actionError.message = err;
        return Response.json(actionError, {
            status: 400,
            headers,
        });
    } finally {
        console.log("hello from get")
    }
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
    try {
        const requestUrl = new URL(req.url);
        console.log(`requestUrl: ${requestUrl}`);
        const { amount: newAmount, toPubkey: newToPubkey, contactInfo: newContactInfo } = validatedQueryParams(requestUrl);
        toPubkey = newToPubkey;
        amount = newAmount;
        contactInfo = newContactInfo;

        console.log(contactInfo);

        const body: ActionPostRequest = await req.json();
        console.log(`body: ${JSON.stringify(body)}`);

        // validate the client provided input
        try {
            account = new PublicKey(body.account);
            console.log(`body.account: ${account}`);
        } catch (err) {
            throw 'Invalid "account" provided';
        }

        const connection = new Connection(
            process.env.SOLANA_RPC! || clusterApiUrl("devnet"),
        );

        // ensure the receiving account will be rent exempt
        const minimumBalance = await connection.getMinimumBalanceForRentExemption(
            0, // note: simple accounts that just store native SOL have `0` bytes of data
        );
        if (amount * LAMPORTS_PER_SOL < minimumBalance) {
            throw `account may not be rent exempt: ${toPubkey.toBase58()}`;
        }

        // create an instruction to transfer native SOL from one wallet to another
        const transferSolInstruction = SystemProgram.transfer({
            fromPubkey: account,
            toPubkey: toPubkey,
            lamports: amount * LAMPORTS_PER_SOL,
        });

        // get the latest blockhash amd block height
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        console.log(`getLatestBlockhash: ${JSON.stringify(await connection.getLatestBlockhash())}`);

        // create a legacy transaction
        const transaction = new Transaction({
            feePayer: account,
            blockhash,
            lastValidBlockHeight,
        }).add(transferSolInstruction);

        // versioned transactions are also supported
        // const transaction = new VersionedTransaction(
        //   new TransactionMessage({
        //     payerKey: account,
        //     recentBlockhash: blockhash,
        //     instructions: [transferSolInstruction],
        //   }).compileToV0Message(),
        //   // note: you can also use `compileToLegacyMessage`
        // );

        const payload: ActionPostResponse = await createPostResponse({
            fields: {
                transaction,
                message: `Send ${amount} SOL to ${toPubkey.toBase58()}`,
            },
            // note: no additional signers are needed
            // signers: [],
        });

        return Response.json(payload, {
            headers,
        });
    } catch (err) {
        console.log(err);
        let actionError: ActionError = { message: "An unknown error occurred" };
        if (typeof err == "string") actionError.message = err;
        return Response.json(actionError, {
            status: 400,
            headers,
        });
    } finally {
        const connection = new Connection(
            process.env.SOLANA_RPC! || clusterApiUrl("devnet"),
        );
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Fetch recent transactions for the receiver account
        const confirmedSignatures = await connection.getSignaturesForAddress(toPubkey, { limit: 1 });
        console.log(`Confirmed signatures for ${toPubkey.toBase58()}: ${JSON.stringify(confirmedSignatures)}`);

        // Find the most recent transaction hash
        mostRecentTransactionHash = confirmedSignatures.length > 0 ? confirmedSignatures[0].signature : null;
        console.log(`Most recent transaction hash: ${mostRecentTransactionHash}`);

        console.log("hello")
    }
};

export const getToPubkey = () => toPubkey;
export const getAmount = () => amount;
export const getContactInfo = () => contactInfo;
export const getAccount = () => account;

// Export the variable to use it in another page
export const getMostRecentTransactionHash = () => mostRecentTransactionHash;

const validatedQueryParams = (requestUrl: URL) => {
    try {
        if (requestUrl.searchParams.get("to")) {
            toPubkey = new PublicKey(requestUrl.searchParams.get("to")!);
        }
    } catch (err) {
        throw "Invalid input query parameter: to";
    }

    try {
        if (requestUrl.searchParams.get("amount")) {
            amount = parseFloat(requestUrl.searchParams.get("amount")!);
        }

        if (amount <= 0) throw "amount is too small";
    } catch (err) {
        throw "Invalid input query parameter: amount";
    }

    try {
        if (requestUrl.searchParams.get("contactInfo")) {
            contactInfo = (requestUrl.searchParams.get("contactInfo")!);
        }

    } catch (err) {
        throw "Invalid input query parameter: contactInfo";
    }

    return {
        amount,
        toPubkey,
        contactInfo
    };
}