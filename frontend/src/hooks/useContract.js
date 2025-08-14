import { ethers } from "ethers";
import { useState, useCallback } from 'react';

export const useContract = (contractAddress, abi) => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const getProvider = useCallback(() => {
        if (window.ethereum) {
            return new ethers.BrowserProvider(window.ethereum);
        }
        throw new Error("No provider available");
    }, []);

    const getSigner = useCallback(async () => {
        const provider = getProvider();
        await provider.send("eth_requestAccounts", []);
        return await provider.getSigner();
    }, [getProvider]);

    const getReadContract = useCallback(() => {
        const provider = getProvider();
        return new ethers.Contract(contractAddress, abi, provider);
    }, [contractAddress, abi, getProvider]);

    const getWriteContract = useCallback(async () => {
        const signer = await getSigner();
        return new ethers.Contract(contractAddress, abi, signer);
    }, [contractAddress, abi, getSigner]);

    const read = useCallback(async (methodName, ...args) => {
        setLoading(true);
        setError(null);
        try {
            const contract = getReadContract();
            const result = await contract[methodName](...args);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getReadContract]);

    const write = useCallback(async (methodName, value, ...args) => {
        setLoading(true);
        setError(null);
        try {
            debugger
            const contract = await getWriteContract();
            const tx = await contract[methodName](...args, { value });
            await tx.wait();
            return tx;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getWriteContract]);

    return {
        read,
        write,
        loading,
        error
    };
};