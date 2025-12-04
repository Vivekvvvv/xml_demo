<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:param name="sortField" select="'price'"/>
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>

  <xsl:template match="/">
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background:#f2f4f7;">
          <th>书号</th>
          <th>书名</th>
          <th>作者</th>
          <th>价格</th>
          <th>分类</th>
          <th>库存</th>
          <th>出版日期</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="library/book">
          <xsl:sort select="*[name()=$sortField]" data-type="text" order="ascending"/>
          <tr>
            <td><xsl:value-of select="id"/></td>
            <td><xsl:value-of select="title"/></td>
            <td><xsl:value-of select="author"/></td>
            <td><xsl:value-of select="price"/></td>
            <td><xsl:value-of select="category"/></td>
            <td><xsl:value-of select="stock"/></td>
            <td><xsl:value-of select="published"/></td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>
</xsl:stylesheet>
