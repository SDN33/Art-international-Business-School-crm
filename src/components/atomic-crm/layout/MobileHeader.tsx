const MobileHeader = ({
  children,
  left,
  right,
}: {
  children?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) => {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-10 bg-secondary w-full"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        height: "calc(3.5rem + env(safe-area-inset-top))",
      }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <div className="w-10 flex items-center">{left ?? null}</div>
        <div className="flex-1 flex items-center justify-center">
          {children}
        </div>
        <div className="w-10 flex items-center justify-end">{right ?? null}</div>
      </div>
    </header>
  );
};

export default MobileHeader;
