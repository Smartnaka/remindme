import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface AlertAction {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  actions: AlertAction[];
  cancelable?: boolean;
}

interface AlertContextData {
  showAlert: (title: string, message?: string, actions?: AlertAction[], options?: { cancelable?: boolean }) => void;
  hideAlert: () => void;
  alertState: AlertState;
}

const AlertContext = createContext<AlertContextData>({
  showAlert: () => {},
  hideAlert: () => {},
  alertState: { visible: false, title: '', actions: [] },
});

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    actions: [],
  });

  const showAlert = (title: string, message?: string, actions?: AlertAction[], options?: { cancelable?: boolean }) => {
    const defaultActions: AlertAction[] = [{ text: 'OK', style: 'default' }];
    setAlertState({
      visible: true,
      title,
      message,
      actions: actions && actions.length > 0 ? actions : defaultActions,
      cancelable: options?.cancelable ?? true,
    });
  };

  const hideAlert = () => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, alertState }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useCustomAlert = () => useContext(AlertContext);
