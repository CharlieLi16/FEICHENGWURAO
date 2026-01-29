import RegistrationForm from "@/components/RegistrationForm";

export const metadata = {
  title: "男嘉宾报名 | NYU Tandon CSSA 2026 非诚勿扰",
  description: "NYU Tandon CSSA 2026 非诚勿扰活动男嘉宾报名",
};

export default function MaleRegistrationPage() {
  return <RegistrationForm gender="male" />;
}
