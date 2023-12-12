import { ENDPOINT_UPDATE_FADATA } from "../sourceData.constants";
import { FadataDto } from "../sourceData.interface";

export const updateFadata = async (data: FadataDto[]) => {
  try {
    const response = await fetch(ENDPOINT_UPDATE_FADATA, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(data),
    });
    return response;
  } catch (error) {
    console.log(error);
  }
};
