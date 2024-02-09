import React, { useCallback, useEffect, useState } from "react";
import { Formik } from "formik";

import { UrlState } from "bi-internal/core";

import {
  useLockAndUnLock,
  useRowsAndColumnsFapart,
  extractUpdateData,
  mapColumns,
  mapRows,
  insertFapart,
  updateFapart,
} from "./utils";
import { SharesInfluenceLayout } from "./SharesInfluence.layout";
import { Column, FapartDto, Row } from "./sharesInfluence.interface";
import { KoobDataService } from "bi-internal/services";
import { KOOB_ID_FAPART, dimensionsFapart } from "./sharesInfluence.constants";

const SharesInfluence = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [changedData, setChangedData] = useState(new Set<string>());
  // Флаг открытия закрытия редактирования. Выставляется после блокировки
  const [isEditing, setIsEditing] = useState(false);
  // Флаг отвечает за перезагрузку данных, если открыли на редактирование.
  const [isReload, setIsReload] = useState(false);

  const { lock, unlock } = useLockAndUnLock({ setIsEditing });

  const addChangedData = useCallback(
    (value: string) => {
      setChangedData(new Set<string>(changedData.add(value)));
    },
    [changedData, setChangedData]
  );

  const url = UrlState.getInstance().getModel();
  const pred_id = url?._pred_id;
  const fiscper = url?._fiscper;
  const fiscvar = url?._fiscvar;
  const user_id = url?._user_id;
  const ir_flag = Number(url?._ir_flag);
  const branch = url?._branch;
  const farm = url?._farm;

  const filters: { [key: string]: any } = {
    FISCVAR: ["=", fiscvar],
    FISCPER: ["=", fiscper],
    BRANCH: ["=", branch],
    FARM: ["=", farm],
    IR_FLAG: ["=", ir_flag],
    TOTAL: ["=", null, "0"],
  };
  useRowsAndColumnsFapart({
    pred_id,
    filters,
    setRows,
    setColumns,
    isReload,
    setIsReload,
    fiscper,
    fiscvar,
    ir_flag,
    branch,
    farm,
  });

  const onSubmit = useCallback(
    async (values: { rows: Row[] }) => {
      const updateData = extractUpdateData(
        values.rows,
        Array.from(changedData)
      );
      let isError = false;
      for (let i = 0; i < updateData.length; i++) {
        const element = updateData[i];
        if (element?.fashare != null) {
          let response = await updateFapart(element);
          if (response?.status !== 200) {
            response = await insertFapart(element);
            isError = response?.status !== 200;
          }
        }
      }
      setRows([]);
      setChangedData(new Set<string>());

      KoobDataService.koobDataRequest3(
        KOOB_ID_FAPART,
        dimensionsFapart,
        [],
        filters
      )
        .then((data: FapartDto[]) => {
          setRows(mapRows(data));
          setColumns(mapColumns(data));
        })
        .catch(() => {
          setRows([]);
          setColumns([]);
        });
      if (isError) {
        alert("Ошибка при сохранении записей");
      }
    },
    [changedData]
  );

  useEffect(() => {
    setChangedData(new Set<string>());
  }, [pred_id, fiscper, fiscvar]);

  // Если пользователь закрыл вкладку на которой была установлена блокировка
  useEffect(() => {
    window.addEventListener("beforeunload", unlock);
    return () => {
      window.removeEventListener("beforeunload", unlock);
    };
  }, [pred_id]);

  const onPopState = useCallback(() => {
    if (isEditing) {
      unlock();
    }
  }, [isEditing, pred_id, unlock]);

  // Если пользователь нажал назад будучи на вкладке на которой была установлена блокировка
  useEffect(() => {
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [pred_id, onPopState]);

  if (
    pred_id === undefined ||
    fiscper === undefined ||
    fiscvar === undefined ||
    user_id === undefined ||
    ir_flag === undefined ||
    branch === undefined ||
    farm === undefined
  ) {
    return <div>Переход был осуществлен не из TreeView</div>;
  }

  if (columns.length === 0 && rows.length === 0) {
    return <div>Ничего не найдено</div>;
  }

  return (
    <div style={{ padding: "20px", overflow: "scroll", maxHeight: "80vh" }}>
      <Formik initialValues={{ rows }} onSubmit={onSubmit} enableReinitialize>
        <SharesInfluenceLayout
          columns={columns}
          rows={rows}
          addChangedData={addChangedData}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          setIsReload={setIsReload}
          lock={lock}
          unlock={unlock}
        />
      </Formik>
    </div>
  );
};

export default SharesInfluence;
