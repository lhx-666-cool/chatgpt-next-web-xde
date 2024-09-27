"use client";

require("../polyfill");

import { useState, useEffect } from "react";

import styles from "./home.module.scss";

import BotIcon from "../icons/loge.svg";
import LoadingIcon from "../icons/three-dots.svg";

import { getCSSVar, getUserId, useMobileScreen } from "../utils";

import dynamic from "next/dynamic";
import { ModelProvider, Path, SlotID } from "../constant";
import { ErrorBoundary } from "./error";

import { getISOLang, getLang } from "../locales";

import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { SideBar } from "./sidebar";
import { useAppConfig } from "../store/config";
import { AuthPage } from "./auth";
import { getClientConfig } from "../config/client";
import { useChatStore } from "../store/chat";
import { ClientApi } from "../client/api";
import { useAccessStore } from "../store";

export function Loading(props: { noLogo?: boolean }) {
  return (
    <div className={styles["loading-content"] + " no-dark"}>
      {!props.noLogo && <BotIcon />}
      <LoadingIcon />
    </div>
  );
}

const Settings = dynamic(async () => (await import("./settings")).Settings, {
  loading: () => <Loading noLogo />,
});

const Chat = dynamic(async () => (await import("./chat")).Chat, {
  loading: () => <Loading noLogo />,
});

const NewChat = dynamic(async () => (await import("./new-chat")).NewChat, {
  loading: () => <Loading noLogo />,
});

const MaskPage = dynamic(async () => (await import("./mask")).MaskPage, {
  loading: () => <Loading noLogo />,
});

export function useSwitchTheme() {
  const config = useAppConfig();

  useEffect(() => {
    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (config.theme === "dark") {
      document.body.classList.add("dark");
      document.body.classList.remove("auto");
    } else if (config.theme === "light") {
      document.body.classList.add("light");
      document.body.classList.remove("auto");
    } else {
      document.body.classList.add("auto");
    }

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media*="dark"]',
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"][media*="light"]',
    );

    if (config.theme === "auto") {
      metaDescriptionDark?.setAttribute("content", "#151515");
      metaDescriptionLight?.setAttribute("content", "#fafafa");
    } else {
      const themeColor = getCSSVar("--theme-color");
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    }
  }, [config.theme]);
}

function useHtmlLang() {
  useEffect(() => {
    const lang = getISOLang();
    const htmlLang = document.documentElement.lang;

    if (lang !== htmlLang) {
      document.documentElement.lang = lang;
    }
  }, []);
}

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

const loadAsyncGoogleFont = () => {
  const linkEl = document.createElement("link");
  const proxyFontUrl = "/google-fonts";
  const remoteFontUrl = "https://fonts.googleapis.com";
  const googleFontUrl =
    getClientConfig()?.buildMode === "export" ? remoteFontUrl : proxyFontUrl;
  linkEl.rel = "stylesheet";
  linkEl.href =
    googleFontUrl +
    "/css2?family=" +
    encodeURIComponent("Noto Sans:wght@300;400;700;900") +
    "&display=swap";
  document.head.appendChild(linkEl);
};

function Screen() {
  const config = useAppConfig();
  const location = useLocation();
  const isHome = location.pathname === Path.Home;
  const isAuth = location.pathname === Path.Auth;
  const isMobileScreen = useMobileScreen();
  const shouldTightBorder =
    getClientConfig()?.isApp || (config.tightBorder && !isMobileScreen);

  useEffect(() => {
    loadAsyncGoogleFont();
  }, []);

  return (
    <div
      className={
        styles.container +
        ` ${shouldTightBorder ? styles["tight-container"] : styles.container} ${
          getLang() === "ar" ? styles["rtl-screen"] : ""
        }`
      }
    >
      {isAuth ? (
        <>
          <AuthPage />
        </>
      ) : (
        <>
          <SideBar className={isHome ? styles["sidebar-show"] : ""} />

          <div className={styles["window-content"]} id={SlotID.AppBody}>
            <Routes>
              <Route path={Path.Home} element={<Chat />} />
              <Route path={Path.NewChat} element={<NewChat />} />
              <Route path={Path.Masks} element={<MaskPage />} />
              <Route path={Path.Chat} element={<Chat />} />
              <Route path={Path.Settings} element={<Settings />} />
            </Routes>
          </div>
        </>
      )}
    </div>
  );
}

export function useLoadData() {
  const config = useAppConfig();
  var api: ClientApi;
  if (config.modelConfig.model.startsWith("gemini")) {
    api = new ClientApi(ModelProvider.GeminiPro);
  } else {
    api = new ClientApi(ModelProvider.GPT);
  }
  useEffect(() => {
    (async () => {
      const models = await api.llm.models();
      config.mergeModels(models);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function Home() {
  useSwitchTheme();
  useLoadData();
  useHtmlLang();
  const config = useAppConfig();
  const chat = useChatStore();
  const { getRemoteSession } = useChatStore();
  useEffect(() => {
    const backendUrl = "https://xdechat.xidian.edu.cn/formatapi"
    // const backendUrl = "http://127.0.0.1:2222"
    // const backendUrl = "http://127.0.0.1:2222";
    // const backendUrl = "http://123.60.97.63:33333";

    console.log("[Config] got config from build time", getClientConfig());
    useAccessStore.getState().fetch();
    let user_id = getUserId();
    const baseUrl = useAccessStore.getState().openaiUrl;
    let chatmsg =
      '[{"id":"S6b31U9DwZ9iJQrklAi0_","topic":"新的聊天","memoryPrompt":"","messages":[],"stat":{"tokenCount":0,"wordCount":0,"charCount":0},"lastUpdate":1714020809584,"lastSummarizeIndex":0,"mask":{"id":"ppB7YXvhE6H-H1Q58D_KT","avatar":"gpt-bot","name":"New Conversation","context":[],"syncGlobalConfig":true,"modelConfig":{"model":"gpt-3.5-turbo","temperature":0.5,"top_p":1,"max_tokens":4000,"presence_penalty":0,"frequency_penalty":0,"sendMemory":true,"historyMessageCount":4,"compressMessageLengthThreshold":1000,"enableInjectSystemPrompts":true,"template":"{{input}}"},"lang":"en","builtin":false,"createdAt":1714020809584}}]';
    fetch(backendUrl + "/get-record?uid=" + user_id, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.code === 200) {
          let chatmsg_list: string[] = [];
          data.data.forEach((i: any) => {
            chatmsg_list.push(JSON.parse(i.record));
          });
          chatmsg = JSON.stringify(chatmsg_list.reverse());
          getRemoteSession(chatmsg);
          // console.log(chatmsg)
        }
      })
      .catch((e) => {
        console.log(e);
      });
  }, []);

  if (!useHasHydrated()) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Screen />
      </Router>
    </ErrorBoundary>
  );
}
