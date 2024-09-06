import { getToPubkey, getAmount, getContactInfo, getAccount, getMostRecentTransactionHash } from "../transfer-sol/route";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { promises as fs } from 'fs';
import path from 'path';
import nodemailer from "nodemailer";
import crypto from 'crypto';

export const GET = async (req: Request) => {
    const toPubkey = getToPubkey();
    const amount = getAmount();
    const contactInfo = getContactInfo();
    const mostRecentTransactionHash = getMostRecentTransactionHash();
    const account = getAccount();

    console.log(toPubkey.toBase58(), amount, contactInfo, mostRecentTransactionHash);

    // Fetch transactions that happened after the most recent transaction hash
    let latestTransaction = await fetchLatestTransactionAfterHash(toPubkey, mostRecentTransactionHash);

    // Check if the latest transaction exists and is not "waitForConfirmation"
    if (latestTransaction && latestTransaction.signature !== mostRecentTransactionHash && contactInfo !== "") {
        const nftAddress = crypto.randomBytes(20).toString('hex'); // Generate a random NFT address

        const transactionData = {
            transaction: latestTransaction.signature,
            to: toPubkey.toBase58(),
            from: account?.toBase58(),
            amount,
            contactInfo,
            blockTime: latestTransaction.blockTime,
            nftAddress,
            time: latestTransaction.blockTime // Use blockTime as time
        };

        // Use an absolute path based on the current working directory
        const filePath = path.resolve(process.cwd(), 'app/api/actions/contact-info/transaction.json');

        // Read the existing transactions from the file
        let transactions = [];
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            transactions = JSON.parse(fileContent);

            // Ensure transactions is an array
            if (!Array.isArray(transactions)) {
                transactions = [];
            }
        } catch (error) {
            if (error) {
                throw error; // Rethrow if the error is not "file not found"
            }
        }

        // Check if the latest transaction hash already exists in the transactions
        const transactionExists = transactions.some((tx: { transaction: string; }) => tx.transaction === latestTransaction.signature);

        // Prepend the new transaction data if it does not already exist
        if (!transactionExists) {
            transactions = [transactionData, ...transactions];

            // Write the updated transactions back to the file
            await fs.writeFile(filePath, JSON.stringify(transactions, null, 2));

            // Log a message indicating the file creation
            console.log(`Transaction data has been written to ${filePath}`);

            // Send an email notification
            await sendEmailNotification(contactInfo, latestTransaction.signature, amount, toPubkey.toBase58());
        }

        return new Response(JSON.stringify({
            transaction: latestTransaction.signature,
            to: toPubkey.toBase58(),
            from: account?.toBase58(),
            amount,
            contactInfo,
            blockTime: latestTransaction.blockTime,
            nftAddress,
            time: latestTransaction.blockTime
        }), { status: 200 });
    } else {
        return new Response(JSON.stringify({
            message: "No new transactions found or waiting for confirmation."
        }), { status: 200 });
    }
};

const fetchLatestTransactionAfterHash = async (toPubkey: PublicKey, lastTransactionHash: string | null) => {
    const connection = new Connection(clusterApiUrl("devnet"));
    const confirmedSignatures = await connection.getSignaturesForAddress(toPubkey);

    // Find the index of the last transaction hash
    const lastTransactionIndex = confirmedSignatures.findIndex(signatureInfo => signatureInfo.signature === lastTransactionHash);

    // Filter transactions that happened after the specified transaction hash
    const filteredTransactions = lastTransactionIndex !== -1 ? confirmedSignatures.slice(0, lastTransactionIndex) : confirmedSignatures;

    // Get the latest transaction from the filtered transactions
    const latestTransaction = filteredTransactions.length > 0 ? filteredTransactions[0] : null;

    return latestTransaction;
};

const sendEmailNotification = async (toEmail: string, transactionSignature: string, amount: number, tutorAddress: string) => {
    const GMAIL_KEY = process.env.GMAIL_KEY;
    // Create a transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'zikrizhan@gmail.com', // Replace with your Gmail address
            pass: GMAIL_KEY   // Replace with your app-specific password
        }
    });

    // Email content
    const mailOptions = {
        from: 'zikrizhan@gmail.com', // Replace with your Gmail address
        to: toEmail,
        subject: 'Payment Confirmation and Your Movie Ticket',
        text: `Dear customer,

We are pleased to inform you that your payment for the movie has been successfully processed. You can view the details of your transaction by following this link: https://explorer.solana.com/tx/${transactionSignature}

Your movie ticket has been issued in the form of an NFT and has been successfully transferred to your wallet. Please let us know if you have any questions or need further assistance.

Thank you for choosing us, and enjoy the movie!

Warm regards,
Pisang Biru SDN BHD`
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${toEmail}`);
};