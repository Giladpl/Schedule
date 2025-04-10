import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    // Save the original title
    const originalTitle = document.title;

    // Update the title
    document.title = `${title} | לוח פגישות`;

    // Restore the original title when the component unmounts
    return () => {
      document.title = originalTitle;
    };
  }, [title]);
}
