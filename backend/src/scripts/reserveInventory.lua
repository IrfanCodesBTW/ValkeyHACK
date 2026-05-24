for i = 1, #KEYS do
  local quantity = tonumber(redis.call("HGET", KEYS[i], "quantity") or "0")
  local reserved = tonumber(redis.call("HGET", KEYS[i], "reserved") or "0")
  local requested = tonumber(ARGV[i])
  if quantity - reserved < requested then
    return {0, i, quantity - reserved}
  end
end

for i = 1, #KEYS do
  redis.call("HINCRBY", KEYS[i], "quantity", -tonumber(ARGV[i]))
end

return {1, 0, 0}
