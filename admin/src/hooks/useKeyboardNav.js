import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * 键盘快捷键导航
 *
 * 快捷键:
 *   Ctrl/Cmd + D  →  仪表盘
 *   Ctrl/Cmd + W  →  作品管理
 *   Ctrl/Cmd + E  →  人员管理
 *   Ctrl/Cmd + C  →  分类字典
 *   Ctrl/Cmd + I  →  图片库
 *   Ctrl/Cmd + ,  →  系统设置
 *   Escape        →  关闭弹窗（由各弹窗自行处理）
 *
 * 仅在不聚焦输入框时生效（避免与文本输入冲突）。
 */

const SHORTCUTS = [
  { key: 'd', path: '/dashboard' },
  { key: 'w', path: '/works' },
  { key: 'e', path: '/designers' },
  { key: 'c', path: '/categories' },
  { key: 'i', path: '/images' },
  { key: ',', path: '/settings' },
];

export default function useKeyboardNav() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (e) => {
      // 聚焦在输入框/文本域时不触发
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      for (const { key, path } of SHORTCUTS) {
        if (e.key.toLowerCase() === key) {
          e.preventDefault();
          if (location.pathname !== path) {
            navigate(path);
          }
          return;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, location.pathname]);
}
