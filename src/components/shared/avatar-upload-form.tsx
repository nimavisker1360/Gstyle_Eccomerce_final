"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateUserAvatar } from "@/lib/actions/user.actions";
import FullscreenLoading from "@/components/shared/fullscreen-loading";

type Props = {
  userId: string;
  inputId: string;
  formClass: string;
  fileInputWrapperClass: string;
  fileInputClass: string;
  fileInputLabelClass: string;
  filePlaceholderClass: string;
  submitButtonClass: string;
};

export default function AvatarUploadForm(props: Props) {
  const {
    userId,
    inputId,
    formClass,
    fileInputWrapperClass,
    fileInputClass,
    fileInputLabelClass,
    filePlaceholderClass,
    submitButtonClass,
  } = props;

  const formRef = useRef<HTMLFormElement>(null);
  // Keep overlay visible for at least 3 seconds
  const [minHoldActive, setMinHoldActive] = useState(false);

  const handleSubmit = () => {
    setMinHoldActive(true);
    setTimeout(() => setMinHoldActive(false), 3000);
  };

  function PendingOverlay({ active }: { active: boolean }) {
    const { pending } = useFormStatus();
    if (!pending && !active) return null;
    return <FullscreenLoading title="در حال ذخیره آواتار..." />;
  }

  return (
    <>
      <form
        ref={formRef}
        action={updateUserAvatar}
        className={formClass}
        encType="multipart/form-data"
        onSubmit={handleSubmit}
      >
        <PendingOverlay active={minHoldActive} />
        <input type="hidden" name="userId" value={userId} />
        <div className={fileInputWrapperClass}>
          <input
            id={inputId}
            type="file"
            name="avatar"
            accept="image/png,image/jpeg,image/webp"
            className={fileInputClass}
          />
          <label htmlFor={inputId} className={fileInputLabelClass}>
            انتخاب فایل
          </label>
          <div className={filePlaceholderClass}>فایلی انتخاب نشده</div>
        </div>
        <button type="submit" className={submitButtonClass}>
          ذخیره آواتار
        </button>
      </form>
    </>
  );
}
