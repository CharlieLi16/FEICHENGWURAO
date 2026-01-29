import RegistrationForm from "@/components/RegistrationForm";

export const metadata = {
  title: "女嘉宾报名 | NYU Tandon CSSA 2026 非诚勿扰",
  description: "NYU Tandon CSSA 2026 非诚勿扰活动女嘉宾报名",
};

export default function FemaleRegistrationPage() {
  return <RegistrationForm gender="female" />;
}
