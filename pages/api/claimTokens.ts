import { NextApiRequest, NextApiResponse } from "next";
import { Engine } from "@thirdweb-dev/engine";
import {
  LORD_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ADDRESS,
} from "../../constants/contracts";
import { Sepolia } from "@thirdweb-dev/chains";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  const {
    THIRDWEB_ENGINE_URL,
    THIRDWEB_ENGINE_ACCESSTOKEN,
    THIRDWEB_ENGINE_WALLET,
  } = process.env;

  try {
    if (
      !THIRDWEB_ENGINE_URL ||
      !THIRDWEB_ENGINE_ACCESSTOKEN ||
      !THIRDWEB_ENGINE_WALLET
    ) {
      throw new Error("Environment variables not set");
    }

    const { address } = req.body;
    if (!address) {
      throw new Error("Address not provided");
    }

    const engine = new Engine({
      url: THIRDWEB_ENGINE_URL,
      accessToken: THIRDWEB_ENGINE_ACCESSTOKEN,
    });

    console.log(`ENGINE INITIALIZED. Try to claim Lord NFT to ${address}`);

    const _claimLord = await engine.erc721.claimTo(
      "sepolia",
      LORD_CONTRACT_ADDRESS,
      THIRDWEB_ENGINE_WALLET,
      {
        receiver: address,
        quantity: "1",
      },
      false
    );

    const claimToTokens = await engine.erc20.mintTo(
      "sepolia",
      TOKEN_CONTRACT_ADDRESS,
      THIRDWEB_ENGINE_WALLET,
      {
        toAddress: address,
        amount: "100",
      }
    );

    const awaitForBlockchain = async (queueID: string) => {
      let status = "";
      while (status !== "mined") {
        const response = await engine.transaction.status(queueID);
        status = response.result.status as string;

        if (status === "mined") {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 20000));
      }
    };

    await awaitForBlockchain(_claimLord.result.queueId);
    console.log("Lord NFT Claimed");
    await awaitForBlockchain(claimToTokens.result.queueId);
    console.log("Tokens Claimed");

    return res.status(200).json({ message: "Lord NFT and Tokens claimed" });
  } catch (error) {
    console.log("🚨 Error: ", error);
    return res.status(500).json({ message: "Error claiming tokens" });
  }
};

export default handler;