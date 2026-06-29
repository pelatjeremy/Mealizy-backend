type PageScaffoldProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function PageScaffold({ title, description, children, action }: PageScaffoldProps) {
  return (
    <main className="page-wrap">
      <header className="page-header simple">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action}
      </header>
      {children}
    </main>
  );
}
