import { hexToU8a, isHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

export const isValidSubstrateAddress = (address: string): boolean => {
    try {
      encodeAddress(
        isHex(address)
          ? hexToU8a(address)
          : decodeAddress(address)
      );

      return true;
    } catch ( error ) {
      return false;
    }
  };