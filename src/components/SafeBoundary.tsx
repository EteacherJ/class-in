import React from 'react';

/**
 * 🛟 창 하나에서 오류가 나도 프로그램 전체가 멈추지 않게 감싸는 안전망
 *  - 오류가 나면 그 창만 닫고 안내 문구를 띄워요
 *  - resetKey 가 바뀌면(창을 다시 열면) 다시 정상적으로 그려요
 */
interface Props {
  children: React.ReactNode;
  name: string;
  resetKey?: unknown;
  onError?: (message: string) => void;
}
interface State {
  failed: boolean;
}

export class SafeBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error(`🛟 [${this.props.name}] 오류를 막았어요:`, error);
    this.props.onError?.(`⚠️ ${this.props.name} 창에서 문제가 생겨 창을 닫았어요. 입력한 내용은 저장되어 있어요. 다시 열어 주세요.`);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default SafeBoundary;
