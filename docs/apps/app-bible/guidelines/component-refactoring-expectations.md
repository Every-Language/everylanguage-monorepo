# Component Refactoring Expectations

## 🎯 **Core Philosophy**

**Practical refactoring that improves organization and maintainability without unnecessary abstraction or complexity.**

## 📋 **Refactoring Expectations**

### **1. Component-First Approach** 🎯

- **Keep logic within components that use it**
- **Only create custom hooks if the function is used by multiple files**
- **Don't extract logic unless it's truly reusable**

### **2. Eliminate Prop Drilling** 🔄

- **Make components self-contained by using hooks directly**
- **Remove unnecessary prop passing between components**
- **Components should get data directly from hooks instead of receiving it as props**

### **3. UI Refactoring for Better Organization** 🎨

- **UI can be refactored even if it's not reusable**
- **Focus on better organization within components**
- **Clear separation of concerns**
- **Extract UI configuration objects for better readability**

### **4. No Over-Engineering** ⚖️

- **Don't create separate stylesheets unless necessary**
- **Don't create extra component folders unless needed**
- **Keep it simple and practical**
- **Avoid unnecessary abstraction layers**

### **5. Maintain Functionality** ✅

- **Don't change functionality**
- **Ensure no animation issues**
- **Preserve all existing behavior**
- **Test thoroughly after refactoring**

### **6. Better Code Organization** 📁

- **Use logical folder structure**
- **Clean exports through index files**
- **Group related components together**
- **Consistent naming and structure**

### **7. Fix Animation Issues** 🎬

- **Proper use of Reanimated hooks**
- **No direct `.value` access during render**
- **Use `useDerivedValue` and `useAnimatedStyle` correctly**
- **Fix Reanimated warnings properly**

### **8. Quality Standards** 🔍

- **Run linter and fix errors**
- **Ensure TypeScript compilation**
- **Maintain code quality**
- **Follow established patterns**

## 🚀 **Implementation Strategy**

### **For Component Refactoring:**

1. **Identify prop drilling** - Look for props that are just passing hook values
2. **Make components self-contained** - Use hooks directly in child components
3. **Organize with clear sections** - Group related logic together
4. **Extract UI configuration** - Use objects for complex prop configurations
5. **Test thoroughly** - Ensure no functionality is broken

### **For UI Refactoring:**

1. **Organize component structure** with clear sections:
   - `HOOKS & STATE`
   - `ACTIONS`
   - `CALCULATED VALUES`
   - `EVENT HANDLERS`
   - `EFFECTS`
   - `UI CONFIGURATION`
   - `RENDER`
2. **Extract configuration objects** for complex components
3. **Group related styles** with comments
4. **Maintain clean imports** and exports

### **For Animation Issues:**

1. **Never access `.value` during render**
2. **Use `useDerivedValue` for calculations**
3. **Use `useAnimatedStyle` for style animations**
4. **Keep shared value access within worklet context**

## ✅ **Success Criteria**

- **Components are self-contained** and get data directly from hooks
- **No unnecessary prop drilling** between components
- **Clear organization** with logical sections
- **No animation warnings** or issues
- **All functionality preserved** after refactoring
- **Clean, linted code** with proper TypeScript types
- **Consistent folder structure** and exports

## 🎯 **Key Principles**

1. **Keep logic where it's used** - Don't extract unless truly reusable
2. **Make components self-contained** - Use hooks directly instead of prop drilling
3. **Organize for clarity** - Better structure without over-engineering
4. **Preserve functionality** - Don't break existing behavior
5. **Fix issues properly** - Address animation and other problems
6. **Maintain quality** - Clean, linted, well-typed code

---

_This document serves as a reference for all future component refactoring work to ensure consistency and quality._
