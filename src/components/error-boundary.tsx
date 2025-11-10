"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorPopup } from "./error-popup";
import { ErrorInfo as ErrorInfoType } from "@/lib/error-handler";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: ErrorInfoType | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error: {
        message: error.message || "Erro no componente React",
        details: error.stack,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        type: "react",
      },
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🚨 Erro capturado pelo ErrorBoundary:", error, errorInfo);
    
    this.setState({
      hasError: true,
      error: {
        message: error.message || "Erro no componente React",
        details: `Componente: ${errorInfo.componentStack || "Desconhecido"}`,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        type: "react",
      },
    });
  }

  handleClose = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <>
          {this.props.children}
          <ErrorPopup error={this.state.error} onClose={this.handleClose} />
        </>
      );
    }

    return this.props.children;
  }
}

