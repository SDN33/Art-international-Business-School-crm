const MobileHeader = ({ children }: { children: React.ReactNode }) => {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-10 bg-secondary px-4 w-full flex justify-between items-end"
      style={{
        paddingTop: "calc(0.75rem + env(safe-area-inset-top))",
        paddingBottom: "0.75rem",
        height: "calc(3.5rem + env(safe-area-inset-top))",
      }}
    >
      {children}
    </header>
  );
};

export default MobileHeader;
