import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInbox } from '@fortawesome/free-solid-svg-icons';

/** «Пустое состояние»: показываем, когда данных нет, вместо пустого места */
export default function EmptyState({ text, icon = faInbox, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center text-gray-500">
      <FontAwesomeIcon icon={icon} className="text-4xl text-gray-300" />
      <p>{text}</p>
      {children}
    </div>
  );
}
