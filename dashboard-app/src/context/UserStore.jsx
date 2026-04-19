import React, { createContext, useContext, useState, useEffect } from "react";
import { USER } from "../data/userData";

const UserContext = createContext();

function useLocalStorageState(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = value => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
}

export function UserStoreProvider({ children }) {
  const [mode, setMode] = useLocalStorageState("growthtrack_mode", "dark");
  const [accent, setAccent] = useLocalStorageState("growthtrack_accent", "gold");
  const [done, setDone] = useLocalStorageState("growthtrack_done", {});
  const [measurements, setMeasurements] = useLocalStorageState("growthtrack_measurements", [
    { week: "Week 1", length: USER.currentLength, girth: USER.currentGirth },
  ]);

  const addMeasurement = (week, length, girth) => {
    setMeasurements(prev => [...prev, { week, length: parseFloat(length), girth: parseFloat(girth) }]);
  };

  const toggleDone = (id) => {
    setDone(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <UserContext.Provider value={{
      mode, setMode,
      accent, setAccent,
      done, toggleDone, setDone,
      measurements, addMeasurement
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserStore() {
  return useContext(UserContext);
}
