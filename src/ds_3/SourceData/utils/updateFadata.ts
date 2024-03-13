import {
  ENDPOINT_UPDATE_FADATA,
  ENDPOINT_UPDATE_FADATA_MASS,
} from "../sourceData.constants";
import { FadataDto } from "../sourceData.interface";

const getUrlChunk = (props: FadataDto) => {
  const { pred_id, fiscper, fiscvar, info_id } = props;
  return `/.filter(pred_id='${pred_id}' && info_id='${info_id}' && fiscper = '${fiscper}' && fiscvar = '${fiscvar}')`;
};

export const updateFadata = async (data: FadataDto) => {
  try {
    const { fa_data } = data;
    const updateData = {
      fa_data: fa_data,
    };
    const response = await fetch(
      `${ENDPOINT_UPDATE_FADATA}${getUrlChunk(data)}`,
      {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-type": "application/json; charset=utf-8" },
        body: JSON.stringify(updateData, (key, value) => {
          if (value !== "") return value;
          else return null;
        }),
      }
    );
    return response;
  } catch (error) {
    console.log(error);
  }
};
export const updateFadataMass = async (data: FadataDto[]) => {
  try {
    const updateObj: {
      update: FadataDto;
    }[] = [];
    data.forEach((element) => {
      updateObj.push({ update: element });
    });

    const response = await fetch(ENDPOINT_UPDATE_FADATA_MASS, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(updateObj, (key, value) => {
        if (value !== "") return value;
        else return null;
      }),
    });
    return response;
  } catch (error) {
    console.log(error);
  }
};
