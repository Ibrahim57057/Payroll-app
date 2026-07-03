// src/components/common/Navigation.jsx
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import authService from "../../services/authService";

const Navigation = ({ activePath, onItemClick }) => {
  const navigate = useNavigate();
  const navItems = authService.getNavItems().map((item) => ({
    ...item,
    active: item.path === activePath,
  }));

  const handleClick = (item) => {
    if (item.path) {
      navigate(item.path);
      if (onItemClick) onItemClick();
    }
  };

  return (
    <nav className="flex-1 py-2 overflow-y-auto">
      {navItems.map((item, index) => (
        <motion.div
          key={index}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: index * 0.03, duration: 0.3 }}
          whileHover={{ x: 4, transition: { duration: 0.2 } }}
          onClick={() => handleClick(item)}
          className={`flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition ${
            item.active
              ? "text-[#0C447C] bg-[#E6F1FB] font-medium border-l-4 border-l-[#E65100]"
              : "text-[#4A4A5A] hover:bg-[#F5F5F7] hover:text-[#1A1A2E]"
          }`}
        >
          <i className={`fas ${item.icon} w-5 text-center text-base`}></i>
          <span>{item.label}</span>
        </motion.div>
      ))}
    </nav>
  );
};

export default Navigation;
