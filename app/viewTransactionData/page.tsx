"use client"
import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

type Transaction = {
    transaction: string;
    to: string;
    from: string;
    amount: number;
    contactInfo: string;
    blockTime?: number | null;
};

const Page: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [buttonText, setButtonText] = useState('Blinks');
    const { publicKey } = useWallet();
    const targetWalletAddress = '3oGRxuPz1Q1ergQ1WvvTtMQthdPAM5pZ9mjEJMSA7xmy';
    const transferLink = 'http://localhost:3000/api/actions/transfer-sol';

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/actions/transaction-data');
                const data = await response.json();
                console.log('Fetched transactions:', data); // Debugging log
                if (Array.isArray(data)) {
                    setTransactions(data);
                } else {
                    console.error('Fetched data is not an array:', data);
                }
            } catch (error) {
                console.error('Error fetching transactions:', error);
            }
        };

        const fetchContactInfo = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/actions/contact-info');
                const data = await response.json();
                console.log('Fetched contact info:', data); // Log the response
            } catch (error) {
                console.error('Error fetching contact info:', error);
            }
        };

        // Fetch transactions and contact info initially
        fetchTransactions();
        fetchContactInfo();
    }, []);

    const shortenAddress = (address: string) => {
        return `${address.slice(0, 7)}...${address.slice(-7)}`;
    };

    const formatBlockTime = (blockTime?: number | null) => {
        if (blockTime === null || blockTime === undefined) {
            return { date: "N/A", time: "N/A" };
        }
        const date = new Date(blockTime * 1000); // Convert to milliseconds
        const dateOptions: Intl.DateTimeFormatOptions = {
            timeZone: 'Asia/Kuala_Lumpur',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };
        const timeOptions: Intl.DateTimeFormatOptions = {
            timeZone: 'Asia/Kuala_Lumpur',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        };
        return {
            date: date.toLocaleDateString('en-US', dateOptions),
            time: date.toLocaleTimeString('en-US', timeOptions),
        };
    };

    const handleCopyClick = () => {
        navigator.clipboard.writeText(transferLink);
        setButtonText('Copied');
    };

    const handleMouseLeave = () => {
        setButtonText('Blinks');
    };

    return (
        <div className="container mx-auto p-4">
            {publicKey?.toString() === targetWalletAddress ? (
                <>
                    <h1 className="text-4xl font-bold text-center mb-6 text-purple-600">Transactions</h1>
                    <div className="mb-4 flex items-center">
                        <span className="text-gray-700 bg-gray-100 py-2 px-4 rounded-lg">{transferLink}</span>
                        <button
                            onClick={handleCopyClick}
                            onMouseLeave={handleMouseLeave}
                            className="ml-2 bg-gray-700 text-white font-bold py-2 px-4 rounded-lg w-32"
                        >
                            {buttonText}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                            <thead className="bg-gray-700 text-white">
                                <tr>
                                    <th className="px-4 py-2 border-b text-center">From</th>
                                    <th className="px-4 py-2 border-b text-center">To</th>
                                    <th className="px-4 py-2 border-b text-center">Amount (SOL)</th>
                                    <th className="px-4 py-2 border-b text-center">Contact Info</th>
                                    <th className="px-4 py-2 border-b text-center">Date</th>
                                    <th className="px-4 py-2 border-b text-center">Time</th>
                                    <th className="px-4 py-2 border-b text-center">Transaction Hash</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((transaction, index) => {
                                    const { date, time } = formatBlockTime(transaction.blockTime);
                                    return (
                                        <tr key={index} className="hover:bg-gray-100">
                                            <td className="px-4 py-2 border-b text-center">{shortenAddress(transaction.from)}</td>
                                            <td className="px-4 py-2 border-b text-center">{shortenAddress(transaction.to)}</td>
                                            <td className="px-4 py-2 border-b text-center">{transaction.amount}</td>
                                            <td className="px-4 py-2 border-b text-center">{transaction.contactInfo}</td>
                                            <td className="px-4 py-2 border-b text-center">{date}</td>
                                            <td className="px-4 py-2 border-b text-center">{time}</td>
                                            <td className="px-4 py-2 border-b text-center">
                                                <a
                                                    href={`https://explorer.solana.com/tx/${transaction.transaction}?cluster=devnet`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {shortenAddress(transaction.transaction)}
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <p className="text-center text-red-600">You are not authorized to view this data.</p>
            )}
        </div>
    );
};

export default Page;