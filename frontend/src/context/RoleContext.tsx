"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type UserRole = "planner" | "executive";

interface RoleContextType {
  role: UserRole;
  isExecutive: boolean;
  isPlanner: boolean;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("planner");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pmo_user_role");
    if (saved === "planner" || saved === "executive") {
      setRoleState(saved);
    }
    setMounted(true);
  }, []);

  function setRole(newRole: UserRole) {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("pmo_user_role", newRole);
    }
  }

  function toggleRole() {
    const next = role === "planner" ? "executive" : "planner";
    setRole(next);
  }

  return (
    <RoleContext.Provider
      value={{
        role,
        isExecutive: role === "executive",
        isPlanner: role === "planner",
        setRole,
        toggleRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
