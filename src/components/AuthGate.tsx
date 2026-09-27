import React from "react";

type User = {
  name: string;
  role: string;
};

type AuthGateProps = {
  children: (user: User, demo: boolean) => React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const user: User = {
    name: "Rafael Silva",
    role: "Administrador",
  };

  const demo = true;

  return <>{children(user, demo)}</>;
}