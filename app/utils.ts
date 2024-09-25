import { useEffect, useState } from "react";
import { showToast } from "./components/ui-lib";
import Locale from "./locales";
import { RequestMessage } from "./client/api";
import { DEFAULT_MODELS } from "./constant";
import { useAccessStore } from "@/app/store";
import $ from "jquery";
import { json } from "stream/consumers";
import { execOnce } from "next/dist/shared/lib/utils";

const backendUrl = "https://xdechat.xidian.edu.cn/formatapi";
// const backendUrl = "https://xdechat.xidian.edu.cn/forma"
// const backendUrl = "http://127.0.0.1:2222";
// const backendUrl = "http://123.60.97.63:33333";

export function getQueryVariable(variable: string) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  }
  return "";
}

export function getUserId() {
  // return "114514";
  const value = localStorage.getItem('userid');
  if (value !== null) {
    return value
  } else {
    const ticket = getQueryVariable('ticket')
    if (ticket === "") {
      window.location.href = "https://ids.xidian.edu.cn/authserver/login?service=https://xdechat.xidian.edu.cn/"
    } else {
      fetch('https://ids.xidian.edu.cn/authserver/serviceValidate?service=https://xdechat.xidian.edu.cn/&ticket=' + ticket)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
          }
          return response.text(); // 如果返回的是纯文本/HTML
        })
        .then(data => {
          // console.log(data); // 在控制台打印请求结果
          const regex = /<cas:uid>(.*?)<\/cas:uid>/;
          const match = data.match(regex);
          const nameRegex = /<cas:userName>(.*?)<\/cas:userName>/;
          const nameMatch = data.match(regex);
          if (match && nameMatch) {
            const result = match[1];
            // console.log(result);  // 输出: test_xdechat
            window.localStorage.setItem('userid', result)
            const nameResult = nameMatch[1];
            window.localStorage.setItem('username', nameResult);
          } else {
            window.location.href = "https://ids.xidian.edu.cn/authserver/login?service=https://xdechat.xidian.edu.cn/"
          }
        })
        .catch(error => {
          console.error('There was a problem with the fetch operation:', error);
        });
    }
  }
  return window.localStorage.getItem('userid');
}

export function getName() {
  getUserId();
  if (window.localStorage.getItem('username')) {
    return "你好 " + window.localStorage.getItem('username');
  }
  return "请登录"
}
export function trimTopic(topic: string) {
  // Fix an issue where double quotes still show in the Indonesian language
  // This will remove the specified punctuation from the end of the string
  // and also trim quotes from both the start and end if they exist.
  return (
    topic
      // fix for gemini
      .replace(/^["“”*]+|["“”*]+$/g, "")
      .replace(/[，。！？”“"、,.!?*]*$/, "")
  );
}

export async function copyToClipboard(text: string) {
  try {
    if (window.__TAURI__) {
      window.__TAURI__.writeText(text);
    } else {
      await navigator.clipboard.writeText(text);
    }

    showToast(Locale.Copy.Success);
  } catch (error) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      showToast(Locale.Copy.Success);
    } catch (error) {
      showToast(Locale.Copy.Failed);
    }
    document.body.removeChild(textArea);
  }
}

export async function like(session: any) {
  const accessStore = useAccessStore.getState();
  let baseUrl = accessStore.openaiUrl;
  let user_id = getUserId();
  $.post({
    url: backendUrl + "/add",
    data: JSON.stringify({
      record: JSON.stringify(session.messages),
      uid: user_id,
      type: "like",
    }),
    contentType: "application/json",
    success: function (res) {
      showToast(Locale.Like.Success);
    },
    error: function (e) {
      console.log(e);
      showToast(Locale.Like.Failed);
    },
  });
}

export async function dislike(session: any) {
  const accessStore = useAccessStore.getState();
  let baseUrl = accessStore.openaiUrl;
  let user_id = getUserId();
  $.post({
    url: backendUrl + "/add",
    data: JSON.stringify({
      record: JSON.stringify(session.messages),
      uid: user_id,
      type: "dislike",
    }),
    contentType: "application/json",
    success: function (res) {
      showToast(Locale.DisLike.Success);
    },
    error: function (e) {
      console.log(e);
      showToast(Locale.DisLike.Failed);
    },
  });
}

export async function feedbackfunc(session: any, msg: string) {
  const accessStore = useAccessStore.getState();
  let baseUrl = accessStore.openaiUrl;
  let user_id = getUserId();
  $.post({
    url: backendUrl + "/add",
    data: JSON.stringify({
      record: JSON.stringify(session.messages),
      uid: user_id,
      type: "feedback",
      content: msg,
    }),
    contentType: "application/json",
    success: function (res) {
      showToast(Locale.Feedback.Success);
    },
    error: function (e) {
      console.log(e);
      showToast(Locale.Feedback.Failed);
    },
  });
}
export async function downloadAs(text: string, filename: string) {
  if (window.__TAURI__) {
    const result = await window.__TAURI__.dialog.save({
      defaultPath: `${filename}`,
      filters: [
        {
          name: `${filename.split(".").pop()} files`,
          extensions: [`${filename.split(".").pop()}`],
        },
        {
          name: "All Files",
          extensions: ["*"],
        },
      ],
    });

    if (result !== null) {
      try {
        await window.__TAURI__.fs.writeTextFile(result, text);
        showToast(Locale.Download.Success);
      } catch (error) {
        showToast(Locale.Download.Failed);
      }
    } else {
      showToast(Locale.Download.Failed);
    }
  } else {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(text),
    );
    element.setAttribute("download", filename);

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }
}

export function compressImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent: any) => {
      const image = new Image();
      image.onload = () => {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        let width = image.width;
        let height = image.height;
        let quality = 0.9;
        let dataUrl;

        do {
          canvas.width = width;
          canvas.height = height;
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx?.drawImage(image, 0, 0, width, height);
          dataUrl = canvas.toDataURL("image/jpeg", quality);

          if (dataUrl.length < maxSize) break;

          if (quality > 0.5) {
            // Prioritize quality reduction
            quality -= 0.1;
          } else {
            // Then reduce the size
            width *= 0.9;
            height *= 0.9;
          }
        } while (dataUrl.length > maxSize);

        resolve(dataUrl);
      };
      image.onerror = reject;
      image.src = readerEvent.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function readFromFile() {
  return new Promise<string>((res, rej) => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json";

    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e: any) => {
        res(e.target.result);
      };
      fileReader.onerror = (e) => rej(e);
      fileReader.readAsText(file);
    };

    fileInput.click();
  });
}

export function isIOS() {
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const onResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return size;
}

export const MOBILE_MAX_WIDTH = 600;
export function useMobileScreen() {
  const { width } = useWindowSize();

  return width <= MOBILE_MAX_WIDTH;
}

export function isFirefox() {
  return (
    typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent)
  );
}

export function selectOrCopy(el: HTMLElement, content: string) {
  const currentSelection = window.getSelection();

  if (currentSelection?.type === "Range") {
    return false;
  }

  copyToClipboard(content);

  return true;
}

function getDomContentWidth(dom: HTMLElement) {
  const style = window.getComputedStyle(dom);
  const paddingWidth =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const width = dom.clientWidth - paddingWidth;
  return width;
}

function getOrCreateMeasureDom(id: string, init?: (dom: HTMLElement) => void) {
  let dom = document.getElementById(id);

  if (!dom) {
    dom = document.createElement("span");
    dom.style.position = "absolute";
    dom.style.wordBreak = "break-word";
    dom.style.fontSize = "14px";
    dom.style.transform = "translateY(-200vh)";
    dom.style.pointerEvents = "none";
    dom.style.opacity = "0";
    dom.id = id;
    document.body.appendChild(dom);
    init?.(dom);
  }

  return dom!;
}

export function autoGrowTextArea(dom: HTMLTextAreaElement) {
  const measureDom = getOrCreateMeasureDom("__measure");
  const singleLineDom = getOrCreateMeasureDom("__single_measure", (dom) => {
    dom.innerText = "TEXT_FOR_MEASURE";
  });

  const width = getDomContentWidth(dom);
  measureDom.style.width = width + "px";
  measureDom.innerText = dom.value !== "" ? dom.value : "1";
  measureDom.style.fontSize = dom.style.fontSize;
  const endWithEmptyLine = dom.value.endsWith("\n");
  const height = parseFloat(window.getComputedStyle(measureDom).height);
  const singleLineHeight = parseFloat(
    window.getComputedStyle(singleLineDom).height,
  );

  const rows =
    Math.round(height / singleLineHeight) + (endWithEmptyLine ? 1 : 0);

  return rows;
}

export function getCSSVar(varName: string) {
  return getComputedStyle(document.body).getPropertyValue(varName).trim();
}

/**
 * Detects Macintosh
 */
export function isMacOS(): boolean {
  if (typeof window !== "undefined") {
    let userAgent = window.navigator.userAgent.toLocaleLowerCase();
    const macintosh = /iphone|ipad|ipod|macintosh/.test(userAgent);
    return !!macintosh;
  }
  return false;
}

export function getMessageTextContent(message: RequestMessage) {
  if (typeof message.content === "string") {
    return message.content;
  }
  for (const c of message.content) {
    if (c.type === "text") {
      return c.text ?? "";
    }
  }
  return "";
}

export function getMessageImages(message: RequestMessage): string[] {
  if (typeof message.content === "string") {
    return [];
  }
  const urls: string[] = [];
  for (const c of message.content) {
    if (c.type === "image_url") {
      urls.push(c.image_url?.url ?? "");
    }
  }
  return urls;
}

export function getChoice(message: string): string[] {
  message = message.replace("请输入问题类别：", "");
  message = message.replace(
    "本次类别选择在本轮对话中有效，更换类别请重启开始对话",
    "",
  );
  message = message.replaceAll("\n", "");

  message = message.replace("----------", "");
  message = message.replace(/##### 当前对话次数: \d.*?\d.*?$/g, "");
  message = message.replaceAll(/- (.*?)\((.*?)\)/g, "$1,$2;");
  let res = message.split(";");
  res.pop();
  return res;
}

export function shouldChoice(message: string): boolean {
  const regex =
    /请输入问题类别：\n本次类别选择在本轮对话中有效，更换类别请重启开始对话\n.*?文件/;
  if (regex.test(message)) {
    return true;
  } else {
    return false;
  }
}

export function uploadFile(file: File, url: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    fetch(url, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          resolve(response);
        } else {
          reject(new Error(`Upload failed with status: ${response.status}`));
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}
export function isVisionModel(model: string) {
  return (
    // model.startsWith("gpt-4-vision") ||
    // model.startsWith("gemini-pro-vision") ||
    model.includes("vision")
  );
}
