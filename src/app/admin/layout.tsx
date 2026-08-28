import { ViewTransition } from "react";
import { ADMIN_TAB_TRANSITION_TYPE } from "./admin-tabs";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col bg-paper-alt">
      <ViewTransition
        name="admin-panel"
        update={{ [ADMIN_TAB_TRANSITION_TYPE]: "admin-fade", default: "none" }}
        default="none"
      >
        {children}
      </ViewTransition>
    </div>
  );
}
