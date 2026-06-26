class ThemeManager {
  constructor() {
    this.currentTheme = 'theme-dark';
  }

  applyTheme(themeClass) {
    if (this.currentTheme) {
      document.body.classList.remove(this.currentTheme);
    }
    this.currentTheme = themeClass;
    document.body.classList.add(themeClass);
  }

  // Combine multiple cosmetic classes for a specific element
  // e.g. for the User Avatar
  getAvatarClasses(frameClass, effectClass) {
    return `avatar-container ${frameClass || ''} ${effectClass || ''}`.trim();
  }
}

export default new ThemeManager();
