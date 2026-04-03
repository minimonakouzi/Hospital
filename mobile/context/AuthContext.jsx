import React, { createContext, useContext, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);

  const login = async (token) => {
    setUserToken(token);
    await AsyncStorage.setItem("token", token);
  };

  const logout = async () => {
    setUserToken(null);
    await AsyncStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ userToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
