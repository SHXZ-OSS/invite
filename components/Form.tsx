"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { toast } from "sonner";
import { githubUsernameSchema } from "../lib/validator";

export function Form() {
 const [isInvalid, setIsInvalid] = useState<boolean>(false);
 const [input, setInput] = useState<string>("");
 const [password, setPassword] = useState<string>("");
 const [loading, setLoading] = useState<boolean>(false);

 const changeText = (e: ChangeEvent<HTMLInputElement>): void => {
  const { value } = e.target;
  setInput(value);

  // Only validate username for UI feedback
  const validation = githubUsernameSchema.shape.username.safeParse(value);
  setIsInvalid(!validation.success);
 };

 const changePassword = (e: ChangeEvent<HTMLInputElement>): void => {
  const { value } = e.target;
  setPassword(value);
 };

 const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
  e.preventDefault();
  const loadingToast = toast.loading("正在发送邀请...");
  setLoading(true);

  if (!input) {
   setLoading(false);
   toast.error("请输入您的用户名！", { id: loadingToast });
   return;
  }

  const validation = githubUsernameSchema.safeParse({ username: input, password });
  if (!validation.success) {
   setLoading(false);
   toast.error(validation.error.issues[0].message, { id: loadingToast });
   return;
  }

  try {
   const res = await fetch("/api/invite", {
    body: JSON.stringify({ username: input, password }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
   });

   setLoading(false);

   if (res.status === 200) {
    toast.success("邀请已发送！请查看您的邮箱。", { id: loadingToast });
    // Clear form after successful submission
    setInput("");
    setPassword("");
    setIsInvalid(false);
   } else {
    const { message } = await res.json();
    toast.error(message.replaceAll("Invitee", "用户").replaceAll("User", "用户"), { id: loadingToast });
   }
  } catch (error) {
   console.error(error);
   setLoading(false);
   toast.error("出错了！请稍后重试。", { id: loadingToast });
  }
 };

 return (
  <form onSubmit={handleSubmit}>
   <div className="flex flex-col gap-2">
    <label htmlFor="input" className="flex justify-center">
     <span className="sr-only">GitHub 用户名</span>
     <input
      id="input"
      type="text"
      className={`${isInvalid ? "border-red-400 bg-red-400/10 text-red-400 placeholder:text-red-400!" : "border-white/20"} rounded-lg border bg-white/10 px-4 py-2 text-white outline-hidden duration-200 placeholder:text-white/50 motion-reduce:transition-none`}
      placeholder="输入您的 GitHub 用户名"
      onChange={changeText}
      value={input}
     />
    </label>
    <label htmlFor="password" className="flex justify-center">
     <span className="sr-only">密码（如需要）</span>
     <input
      id="password"
      type="password"
      className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white outline-hidden duration-200 placeholder:text-white/50 motion-reduce:transition-none"
      placeholder="密码（如需要）"
      onChange={changePassword}
      value={password}
     />
    </label>
    <div className="flex justify-center">
     <button
      className="!focus:bg-white flex cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white outline-hidden duration-200 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
      disabled={loading || isInvalid || !input || input.length < 3}
      type="submit"
     >
      {loading ? (
       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="inline-block size-6 animate-spin text-white">
        <path
         strokeLinecap="round"
         strokeLinejoin="round"
         d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
        />
       </svg>
      ) : (
       "加入我们！"
      )}
     </button>
    </div>
   </div>
  </form>
 );
}
