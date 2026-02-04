"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import MaleIcon from "@/components/icons/MaleIcon";
import FemaleIcon from "@/components/icons/FemaleIcon";

// Convert HEIC to JPEG (iPhone photos) - dynamically import to avoid SSR issues
async function convertHeicToJpeg(file: File): Promise<File> {
  // Check if file is HEIC
  const isHeic = file.type === "image/heic" || 
                 file.type === "image/heif" || 
                 file.name.toLowerCase().endsWith(".heic") ||
                 file.name.toLowerCase().endsWith(".heif");
  
  if (!isHeic) {
    return file;
  }

  try {
    // Dynamic import to avoid SSR issues (heic2any uses window)
    const heic2any = (await import("heic2any")).default;
    
    const blob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    
    // heic2any can return array for multi-image HEIC
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
    
    // Create new file with .jpg extension
    const newFileName = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
    return new File([resultBlob], newFileName, { type: "image/jpeg" });
  } catch (error) {
    console.error("HEIC conversion failed:", error);
    // Return original file if conversion fails
    return file;
  }
}

interface RegistrationFormProps {
  gender: "male" | "female";
}

const SCHOOLS = [
  "NYU",
  "Columbia",
  "The New School",
  "SVA",
  "Pratt",
  "TNS",
  "Cornell Tech",
  "Fordham",
  "Other",
];

const GRADES = [
  "大一",
  "大二",
  "大三",
  "大四",
  "研一",
  "研二",
  "PhD",
  "Other",
];

interface FormData {
  legalName: string;
  nickname: string;
  age: string;
  gender: string;
  orientation: string;
  orientationOther: string;
  school: string;
  schoolOther: string;
  major: string;
  grade: string;
  gradeOther: string;
  wechat: string;
  douyin: string;
  email: string;
  phone: string;
  introduction: string;
}

export default function RegistrationForm({ gender }: RegistrationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    legalName: "",
    nickname: "",
    age: "",
    gender: gender === "male" ? "男" : "女",
    orientation: "",
    orientationOther: "",
    school: "",
    schoolOther: "",
    major: "",
    grade: "",
    gradeOther: "",
    wechat: "",
    douyin: "",
    email: "",
    phone: "",
    introduction: "",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles: File[] = [];
      const newPreviews: string[] = [];
      const oversizedFiles: string[] = [];

      Array.from(selectedFiles).forEach((file) => {
        // Check file size (max 50MB per file)
        if (file.size > 50 * 1024 * 1024) {
          oversizedFiles.push(file.name);
          return;
        }
        newFiles.push(file);

        // Create preview for images
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setFilePreviews((prev) => [...prev, e.target?.result as string]);
          };
          reader.readAsDataURL(file);
        }
      });

      if (oversizedFiles.length > 0) {
        alert(`以下文件超过 50MB 限制，已跳过：\n${oversizedFiles.join("\n")}`);
      }

      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate at least one file is selected
    if (files.length === 0) {
      setErrorMessage("请上传至少一张照片或视频");
      setSubmitStatus("error");
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      // Upload all files
      const fileUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        
        // Convert HEIC to JPEG if needed (iPhone photos)
        if (file.type === "image/heic" || file.type === "image/heif" || 
            file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
          setErrorMessage("正在转换 iPhone 照片格式...");
          file = await convertHeicToJpeg(file);
          setErrorMessage("");
        }
        
        const fileFormData = new FormData();
        fileFormData.append("file", file);
        fileFormData.append("name", formData.legalName);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: fileFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`文件 "${file.name}" 上传失败，请稍后重试或发送邮件到 yl11475@nyu.edu`);
        }

        const uploadResult = await uploadResponse.json();
        fileUrls.push(uploadResult.fileUrl);
      }

      // Then submit the form data with all file URLs
      const submitData = {
        ...formData,
        fileUrl: fileUrls.join(" | "), // Join multiple URLs with separator
        submittedAt: new Date().toISOString(),
      };

      const submitResponse = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!submitResponse.ok) {
        throw new Error("表单提交失败，请稍后重试或发送邮件到 yl11475@nyu.edu");
      }

      setSubmitStatus("success");
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === "success") {
    return (
      <div className="min-h-screen gradient-bg-subtle flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">报名成功！</h2>
          <p className="text-gray-600 mb-6">
            感谢您的报名，我们会尽快与您联系。
            <br />
            期待在非诚勿扰与您相见！
          </p>
          <Link
            href="/"
            className="inline-block btn-primary text-white px-6 py-3 rounded-full font-medium"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const themeColor = gender === "male" ? "blue" : "pink";

  return (
    <div className="min-h-screen gradient-bg-subtle py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-gray-500 hover:text-gray-700 mb-4">
            ← 返回首页
          </Link>
          <Image
            src="/assets/images/tandon-cssa.png"
            alt="NYU Tandon CSSA"
            width={70}
            height={70}
            className="mx-auto mb-3 rounded-xl shadow-md"
          />
          <div className="mb-4">
            {gender === "male" ? (
              <MaleIcon className="w-14 h-14 mx-auto" />
            ) : (
              <FemaleIcon className="w-14 h-14 mx-auto" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {gender === "male" ? "男嘉宾" : "女嘉宾"}报名
          </h1>
          <p className="text-gray-600">NYU Tandon CSSA 2026 非诚勿扰</p>
        </div>

        {/* Warning banner */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
          <p className="text-amber-800 text-sm">
            ⚠️‼️ 如遇登录或上传问题，请将相关资料发送至邮箱{" "}
            <a href="mailto:yl11475@nyu.edu" className="font-semibold underline">
              yl11475@nyu.edu
            </a>
          </p>
        </div>

        {/* Error message */}
        {submitStatus === "error" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6">
          {/* Legal Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              姓名 (Legal Name) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="legalName"
              value={formData.legalName}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20"
              placeholder="请输入您的真实姓名"
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">昵称</label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="请输入昵称（选填）"
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              年龄 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              required
              min="18"
              max="99"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="请输入年龄"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              性别 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="男"
                  checked={formData.gender === "男"}
                  onChange={handleInputChange}
                  required
                  className="mr-2 w-4 h-4 text-primary"
                />
                男
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="女"
                  checked={formData.gender === "女"}
                  onChange={handleInputChange}
                  className="mr-2 w-4 h-4 text-primary"
                />
                女
              </label>
            </div>
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">取向</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="orientation"
                  value="男"
                  checked={formData.orientation === "男"}
                  onChange={handleInputChange}
                  className="mr-2 w-4 h-4"
                />
                男
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="orientation"
                  value="女"
                  checked={formData.orientation === "女"}
                  onChange={handleInputChange}
                  className="mr-2 w-4 h-4"
                />
                女
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="orientation"
                  value="Other"
                  checked={formData.orientation === "Other"}
                  onChange={handleInputChange}
                  className="mr-2 w-4 h-4"
                />
                Other:
                {formData.orientation === "Other" && (
                  <input
                    type="text"
                    name="orientationOther"
                    value={formData.orientationOther}
                    onChange={handleInputChange}
                    className="ml-2 px-2 py-1 border border-gray-300 rounded"
                    placeholder="请说明"
                  />
                )}
              </label>
            </div>
          </div>

          {/* School */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学校 <span className="text-red-500">*</span>
            </label>
            <select
              name="school"
              value={formData.school}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">请选择学校</option>
              {SCHOOLS.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
            {formData.school === "Other" && (
              <input
                type="text"
                name="schoolOther"
                value={formData.schoolOther}
                onChange={handleInputChange}
                className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="请输入学校名称"
              />
            )}
          </div>

          {/* Major */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学院 & 专业 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="major"
              value={formData.major}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="请输入学院和专业"
            />
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              年级 <span className="text-red-500">*</span>
            </label>
            <select
              name="grade"
              value={formData.grade}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">请选择年级</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            {formData.grade === "Other" && (
              <input
                type="text"
                name="gradeOther"
                value={formData.gradeOther}
                onChange={handleInputChange}
                className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="请输入年级"
              />
            )}
          </div>

          {/* WeChat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              微信号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="wechat"
              value={formData.wechat}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="请输入您的微信号"
            />
          </div>

          {/* Douyin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">抖音号</label>
            <input
              type="text"
              name="douyin"
              value={formData.douyin}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="请输入您的抖音号（选填）"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="请输入您的邮箱"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              手机号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="请输入您的手机号"
            />
          </div>

          {/* Photo/Video Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              照片或视频（视频30秒以内） <span className="text-red-500">*</span>
            </label>
            
            {/* Selected files list */}
            {files.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-sm text-gray-600">已选择 {files.length} 个文件：</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="relative bg-gray-50 rounded-lg p-2 border border-gray-200"
                    >
                      {filePreviews[index] ? (
                        <img
                          src={filePreviews[index]}
                          alt={file.name}
                          className="w-full h-24 object-cover rounded mb-2"
                        />
                      ) : file.type.startsWith("video/") ? (
                        <div className="w-full h-24 bg-gray-200 rounded mb-2 flex items-center justify-center text-3xl">
                          🎬
                        </div>
                      ) : (
                        <div className="w-full h-24 bg-gray-200 rounded mb-2 flex items-center justify-center text-3xl">
                          📄
                        </div>
                      )}
                      <p className="text-xs text-gray-600 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload button */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                files.length > 0
                  ? "border-gray-300 hover:border-gray-400"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
              <div>
                <div className="text-3xl mb-2">➕ 📸</div>
                <p className="text-gray-600">
                  {files.length > 0 ? "点击添加更多文件" : "点击上传照片或视频"}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  支持多选，每个文件最大 50MB
                </p>
              </div>
            </div>
          </div>

          {/* Introduction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              自我介绍，兴趣爱好 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="introduction"
              value={formData.introduction}
              onChange={handleInputChange}
              required
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
              placeholder="请介绍一下自己，包括兴趣爱好、理想型等..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full btn-primary text-white py-4 rounded-full font-semibold text-lg ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                提交中...
              </span>
            ) : (
              "提交报名 💕"
            )}
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center text-gray-500 text-sm mt-6">
          * 为必填项 | 您的信息将被保密处理
        </p>
      </div>
    </div>
  );
}
