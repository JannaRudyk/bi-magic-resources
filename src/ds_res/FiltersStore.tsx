import React, { useMemo, useEffect, useState } from "react";

import { KoobFiltersService } from "bi-internal/services";
import { AuthenticationService, repo } from "bi-internal/core";
import { KoobDataService } from "bi-internal/services";

import "./FiltersStore.scss";

const EMPTY_FILTERS_STR = "{}";
const EMPTY_NAME_STR = [];

/* Название куба на получение строк.
 */
export const KOOB_ID_ROWS = "luxmsbi.users_filter";

const getEndpoint = (): string => "/api/db/public.users_filter";

export const dimensionsUserFilterName = [
  {
    id: "save_name",
    type: "STRING",
    sql: "save_name",
    title: "save_name",
  },
];
export const dimensionsUserFilterStr = [
  {
    id: "filter_str",
    type: "STRING",
    sql: "filter_str",
    title: "filter_str",
  },
];

const getUrlFilterChunk = (props: {
  userName: string | undefined;
  schemaName: string;
  dashboardId: number;
  saveName: string | undefined;
}) => {
  const { userName, schemaName, dashboardId, saveName } = props;
  return `/.filter(user_name='${userName}' && schema_name='${schemaName}' && dashboard_id = '${dashboardId}' && save_name='${saveName}')`;
};
//----------------------------
const getUrlNameChunk = (props: {
  userName: string | undefined;
  schemaName: string;
  dashboardId: number;
}) => {
  const { userName, schemaName, dashboardId } = props;
  return `/.filter(user_name='${userName}' && schema_name='${schemaName}' && dashboard_id = '${dashboardId}')`;
};
//============================
/**
 * Загружаем ранее сохранненную строку фильтров с сервера.
 *
 */
const getFiltersString = async (
  userName: string | undefined,
  schemaName: string,
  dashboardId: number,
  saveName: string | undefined
): Promise<string> => {
  const filters: { [key: string]: any } = {
    USER_NAME: ["=", userName],
    SCHEMA_NAME: ["=", schemaName],
    DASHBOARD_ID: ["=", dashboardId],
    SAVE_NAME: ["=", saveName],
  };
  let finalArray: string = "{}";

  await KoobDataService.koobDataRequest3(
    KOOB_ID_ROWS,
    dimensionsUserFilterStr.map((item) => item.id),
    [],
    filters
  ).then((data) => {
    if (Array.isArray(data) && data.length === 1) {
      finalArray = data[0].filter_str;
    }
  });

  return finalArray;
};
const getFiltersStringOld = async (
  userName: string | undefined,
  schemaName: string,
  dashboardId: number,
  saveName: string | undefined
): Promise<string> => {
  try {
    const response = await fetch(
      `${getEndpoint()}${getUrlFilterChunk({
        userName,
        dashboardId,
        schemaName,
        saveName,
      })}`
    );

    // Возвращается массив записей из созданной нами таблицы.
    // Если вернулось 0 или более одного элемента то мы возвращем строку соответствующую пустым фильтрам.
    // Это упрощенная реализация, не предполагающая очисти ошибчно созданных дублирующих записей.
    const records: { filter_str: string }[] = await response.json();
    if (records.length !== 1) {
      return EMPTY_FILTERS_STR;
    }
    return records[0].filter_str;
  } catch (error) {
    console.log(error);
  }
  return EMPTY_FILTERS_STR;
};

const getNameString = async (
  userName: string | undefined,
  schemaName: string,
  dashboardId: number
): Promise<any[]> => {
  const filters: { [key: string]: any } = {
    USER_NAME: ["=", userName],
    SCHEMA_NAME: ["=", schemaName],
    DASHBOARD_ID: ["=", dashboardId],
  };
  let finalArray: string[] = [];

  await KoobDataService.koobDataRequest3(
    KOOB_ID_ROWS,
    dimensionsUserFilterName.map((item) => item.id),
    [],
    filters
  ).then((data) => {
    if (Array.isArray(data) && data.length > 0) {
      finalArray = data.map(function (obj) {
        return obj.save_name;
      });
    }
  });

  return finalArray;
};
//----------------------------------------
const getNameStringOld = async (
  userName: string | undefined,
  schemaName: string,
  dashboardId: number
): Promise<any[]> => {
  try {
    const response = await fetch(
      `${getEndpoint()}${getUrlNameChunk({
        userName,
        dashboardId,
        schemaName,
      })}`
    );
    // Возвращается массив записей из созданной нами таблицы.
    const records: { name_str: string; save_name: string }[] =
      await response.json();
    const arr: string[] = [];
    for (let i = 0; i < records.length; i++) {
      let tst = records[i].save_name;
      arr.push(tst);
    }
    if (records.length === 0) {
      return EMPTY_NAME_STR;
    }
    return arr;
  } catch (error) {
    console.log(error);
  }
  return EMPTY_NAME_STR;
};
//======================================

export interface filterUpd {
  user_name: string;
  schema_name: string;
  dashboard_id: number;
  save_name: string;
  filter_str?: string;
}

export const ENDPOINT_UPDATE_FILTER_MASS =
  "/api/v3/writeback/batch/koob/luxmsbi.users_filter";

export const updateFilterMass = async (data: filterUpd[]) => {
  try {
    const updateData: {
      update: filterUpd;
    }[] = [];
    data.forEach((element) => {
      updateData.push({ update: element });
    });

    const response = await fetch(ENDPOINT_UPDATE_FILTER_MASS, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(updateData, (key, value) => {
        if (value !== "") return value;
        else return null;
      }),
    });
    if (response?.status !== 200) {
      return response;
    } else {
      let parsed = await response?.json();
      const insertData: {
        insert: filterUpd;
      }[] = [];
      parsed.forEach((element) => {
        if (element.count[0] === 0) {
          insertData.push({ insert: element.update });
        }
      });

      if (insertData.length > 0) {
        const response1 = await fetch(ENDPOINT_UPDATE_FILTER_MASS, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-type": "application/json; charset=utf-8" },
          body: JSON.stringify(insertData, (key, value) => {
            if (value !== "") return value;
            else return null;
          }),
        });
        return response1;
      } else {
        return response;
      }
    }
  } catch (error) {
    console.log(error);
  }
};

/**
 * Сохраняем строку фильтров на сервер.
 */
//=====================================
//=====================================
const FiltersStore = (props) => {
  // конфиг передаваемый нашей компоненте системой
  const { cfg } = props;
  // текущее строковое представление фильтров
  const [currentFiltersStr, setCurrentFiltersStr] = useState(EMPTY_FILTERS_STR);
  // строковое представление фильтров загруженное с сервера
  const [savedFilterStr, setSavedFiltersStr] = useState(EMPTY_FILTERS_STR);
  const [NewsavedFilterStr, setNewSavedFiltersStr] =
    useState(EMPTY_FILTERS_STR);
  //----------------------

  const [SavName, setSavName] = useState("Вариант1");
  const [savedNameStr, setSavedNameStr] = useState(EMPTY_FILTERS_STR);
  //console.log(SavName);

  //-----------------------
  // отличаются ли текущие фильтры от сохраненных на сервере
  const isFiltersModified = savedFilterStr !== currentFiltersStr;
  // пустые ли текущие фильтры
  const isFiltersEmpty = currentFiltersStr === EMPTY_FILTERS_STR;
  // получаем служебные объекты, которые будем использовать в дальнейшем.
  const { koobFiltersService, authenticationService } = useMemo(() => {
    const koobFiltersService = KoobFiltersService.getInstance();
    const authenticationService = AuthenticationService.getInstance();
    return { koobFiltersService, authenticationService };
  }, []);
  // callback для события изменения фильтров
  const handleFiltersUpdated = () => {
    if (!koobFiltersService) {
      return;
    }

    const koobFilterModel = koobFiltersService.getModel();

    if (koobFilterModel.loading || koobFilterModel.error) {
      return;
    }
    // обновляем текущее строковое предсталение фильтров
    setCurrentFiltersStr(JSON.stringify(koobFilterModel.filters));
  };

  // подписываемся на события изменения фильтров
  useEffect(() => {
    if (!koobFiltersService) {
      return;
    }
    koobFiltersService.subscribeUpdatesAndNotify(handleFiltersUpdated);
  }, [koobFiltersService]);

  // скачиваем сохраненные ранее фильтры с сервера
  useEffect(() => {
    if (!authenticationService) {
      return;
    }
    const saveName = SavName;
    const username = authenticationService.getModel().username;
    if (username === undefined) {
      return;
    }
    const doWork = async () => {
      const fetchedFiltersStr = await getFiltersString(
        username,
        cfg.dataset.schemaName,
        Number(cfg.dashId),
        saveName
      );
      setSavedFiltersStr(fetchedFiltersStr);
    };
    doWork().finally();
    const doWork2 = async () => {
      const arrN: React.SetStateAction<any[]> = await getNameString(
        username,
        cfg.dataset.schemaName,
        Number(cfg.dashId)
      );

      setLoadName(arrN);
    };
    doWork2().finally();
  }, [authenticationService, cfg, isFiltersModified, SavName]);

  // -----------------------------------------
  function handleChange(e) {
    setSavName(e.target.value);
  }
  // -----------------------------------------

  // обработчик клика по кнопке сохранения фильтров
  const handleSaveFilters = async () => {
    if (!authenticationService) {
      return;
    }

    const username = authenticationService.getModel().username;
    if (username === undefined) {
      return;
    }
    // загружаем текущее строкое представление фильтров на сервер
    const updateData: filterUpd[] = [];
    updateData.push({
      user_name: username,
      schema_name: cfg.dataset.schemaName,
      dashboard_id: Number(cfg.dashId),
      save_name: SavName,
      filter_str: currentFiltersStr,
    });
    await updateFilterMass(updateData);

    // обновляем строковое представление фильтров загруженное с сервера
    setSavedFiltersStr(currentFiltersStr);
    setNewSavedFiltersStr(currentFiltersStr);
    alert("Фильтр сохранен");
  };
  // обработчик клика по кнопке применения ранее сохраненных фильтров
  const handleLoadFilters = async () => {
    const username = authenticationService.getModel().username;
    if (!koobFiltersService || !cfg.dataSource.koob) {
      return;
    }

    if (!savedFilterStr) {
      return;
    }

    const fetchedFiltersStr = await getFiltersString(
      username,
      cfg.dataset.schemaName,
      Number(cfg.dashId),
      loadName2
    );
    console.log(cfg.dataSource.koob);
    console.log("fetched1 ", fetchedFiltersStr);
    koobFiltersService.setFilters(
      cfg.dataSource.koob,
      JSON.parse(fetchedFiltersStr)
    );
  };

  // обработчик клика по кнопке очистки фильтров
  const handleClearFilters = () => {
    if (!koobFiltersService || !cfg.dataSource.koob) {
      return;
    }

    const koobFilterModel = koobFiltersService.getModel();

    if (koobFilterModel.loading || koobFilterModel.error) {
      return;
    }
    // берем текущие фильтры и всем ключам задаем значение undefined
    const newFilters = Object.keys(koobFilterModel.filters).reduce(
      (accumulator, current) => {
        accumulator[current] = undefined;
        return accumulator;
      },
      {}
    );
    // применяем получишийся объект
    koobFiltersService.setFilters(cfg.dataSource.koob, newFilters);
  };

  //-------------------s
  const [loadName, setLoadName] = useState<any[]>([]);
  const [loadName2, setLoadName2] = useState<string>();
  //=======================

  return (
    <div className="row">
      <div className="column" style={{ padding: "10px" }}>
        Введите имя сохранения
        <h1>
          <input
            value={SavName}
            onChange={handleChange}
            defaultValue="Вариант 1"
          />
          <p>
            <button onClick={handleSaveFilters}>Сохранить фильтр</button>
          </p>
        </h1>
      </div>

      <div className="column" style={{ padding: "10px" }}>
        Загрузить
        <h1>
          <select
            value={loadName2}
            onChange={(e) => setLoadName2(e.target.value)}
          >
            {loadName.map((item) => {
              return <option>{item}</option>;
            })}
          </select>
          <p>
            <button onClick={handleLoadFilters}> Загрузить фильтр </button>
          </p>
        </h1>
        <button disabled={isFiltersEmpty} onClick={handleClearFilters}>
          Очистить фильтр
        </button>
        <br />
      </div>
    </div>
  );
};

export default FiltersStore;
