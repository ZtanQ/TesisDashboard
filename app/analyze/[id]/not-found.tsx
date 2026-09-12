import { PAPER_ERROR_MESSAGES } from "@/lib/errors";
import { ErrorNotice } from "@/components/ui/error-notice";

export default function NotFound() {
  const message = PAPER_ERROR_MESSAGES["not-found"];

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-6 py-16">
      <ErrorNotice title={message.title} detail={message.detail} />
    </main>
  );
}
