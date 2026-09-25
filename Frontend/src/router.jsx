import React, { createContext, useContext, useState, useEffect } from 'react';

const RouterContext = createContext(null);

export function RouterProvider({ children }) {
  // Normalize current path and query
  const getCurrentLocation = () => {
    const fullPath = window.location.pathname + window.location.search;
    const path = window.location.pathname;
    const normalized = (path === '/' || path === '') ? '/overview' : path;
    return {
      currentPath: normalized,
      fullPath: (path === '/' || path === '') ? `/overview${window.location.search}` : fullPath,
      search: window.location.search
    };
  };

  const [location, setLocation] = useState(getCurrentLocation());

  useEffect(() => {
    const handlePopState = () => {
      setLocation(getCurrentLocation());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to) => {
    const [targetPath, targetQuery] = to.split('?');
    const normalizedTarget = (targetPath === '/' || targetPath === '') ? '/overview' : targetPath;
    const fullTarget = targetQuery ? `${normalizedTarget}?${targetQuery}` : normalizedTarget;

    if (fullTarget === location.fullPath) return;

    window.history.pushState({}, '', fullTarget);
    setLocation({
      currentPath: normalizedTarget,
      fullPath: fullTarget,
      search: targetQuery ? `?${targetQuery}` : ''
    });
    window.scrollTo(0, 0);
  };

  const getQueryParam = (param) => {
    const params = new URLSearchParams(location.search);
    return params.get(param);
  };

  return (
    <RouterContext.Provider
      value={{
        currentPath: location.currentPath,
        fullPath: location.fullPath,
        search: location.search,
        navigate,
        getQueryParam
      }}
    >
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}

export function Link({ to, children, className = '', activeClassName = '', ...props }) {
  const { currentPath, navigate } = useRouter();
  const basePath = to.split('?')[0];
  const isActive = currentPath === basePath;
  const combinedClassName = `${className} ${isActive ? activeClassName : ''}`.trim();

  const handleClick = (e) => {
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      navigate(to);
    }
  };

  return (
    <a href={to} className={combinedClassName} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
