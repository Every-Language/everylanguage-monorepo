(function () {
  try {
    const savedTheme = localStorage.getItem('omt-theme');
    let theme = savedTheme || 'system';

    if (!['light', 'dark', 'system'].includes(theme)) {
      theme = 'system';
    }

    let resolvedTheme;
    if (theme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } else {
      resolvedTheme = theme;
    }

    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
  } catch (e) {
    // Fallback to light mode if there's an error
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add('light');
  }
})();
